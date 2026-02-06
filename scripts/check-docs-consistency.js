const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

const readFile = (relativePath) =>
  fs.readFileSync(path.join(ROOT, relativePath), "utf8");

const walk = (dir, extensions) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  entries.forEach((entry) => {
    if (entry.name.startsWith(".")) {
      return;
    }
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "build") {
        return;
      }
      files.push(...walk(fullPath, extensions));
      return;
    }
    if (extensions.some((ext) => entry.name.endsWith(ext))) {
      files.push(fullPath);
    }
  });
  return files;
};

const extractHooksFromCode = (files) => {
  const hooks = new Set();
  const filterRegex = /apply_filters\(\s*'([^']+)'/g;
  const actionRegex = /do_action\(\s*'([^']+)'/g;

  files.forEach((file) => {
    const content = fs.readFileSync(file, "utf8");
    let match;
    while ((match = filterRegex.exec(content))) {
      if (match[1].startsWith("lean_stats_")) {
        hooks.add(match[1]);
      }
    }
    while ((match = actionRegex.exec(content))) {
      if (match[1].startsWith("lean_stats_")) {
        hooks.add(match[1]);
      }
    }
  });

  return hooks;
};

const extractHooksFromDocs = () => {
  const content = readFile("docs/HOOKS.md");
  const hooks = new Set();
  const regex = /`(lean_stats_[^`]+)`/g;
  let match;
  while ((match = regex.exec(content))) {
    hooks.add(match[1]);
  }
  return hooks;
};

const extractSettingsFromCode = () => {
  const content = readFile("includes/settings.php");
  const defaultsMatch = content.match(
    /function\s+lean_stats_get_settings_defaults\(\):\s*array\s*\{\s*return\s*\[([\s\S]*?)\];/,
  );
  if (!defaultsMatch) {
    throw new Error("Unable to find lean_stats_get_settings_defaults in settings.php");
  }
  const defaultsBlock = defaultsMatch[1];
  const settings = new Set();
  const regex = /'([a-z0-9_]+)'\s*=>/g;
  let match;
  while ((match = regex.exec(defaultsBlock))) {
    settings.add(match[1]);
  }
  return settings;
};

const extractSettingsFromDocs = () => {
  const settings = new Set();
  const settingsDoc = readFile("docs/SETTINGS.md");
  settingsDoc.split(/\r?\n/).forEach((line) => {
    const match = line.match(/^\|\s*`([^`]+)`\s*\|/);
    if (match) {
      settings.add(match[1]);
    }
  });

  const restDoc = readFile("docs/REST_API.md");
  const lines = restDoc.split(/\r?\n/);
  let inSettingsSection = false;
  let captureSettings = false;

  lines.forEach((line) => {
    if (line.startsWith("### GET `/admin/settings`") || line.startsWith("### POST `/admin/settings`")) {
      inSettingsSection = true;
      captureSettings = false;
      return;
    }

    if (inSettingsSection && line.startsWith("### ")) {
      inSettingsSection = false;
      captureSettings = false;
      return;
    }

    if (inSettingsSection && (line.startsWith("Returned fields:") || line.startsWith("JSON payload:"))) {
      captureSettings = true;
      return;
    }

    if (inSettingsSection && line.startsWith("Response")) {
      captureSettings = false;
      return;
    }

    if (inSettingsSection && captureSettings) {
      const keyMatch = line.match(/^- `([a-z0-9_]+)`/);
      if (keyMatch) {
        settings.add(keyMatch[1]);
      }
    }
  });

  return settings;
};

const extractRestNamespaces = () => {
  const config = readFile("includes/config.php");
  const publicMatch = config.match(/'rest_namespace'\s*=>\s*'([^']+)'/);
  const internalMatch = config.match(/'rest_namespace_internal'\s*=>\s*'([^']+)'/);
  if (!publicMatch || !internalMatch) {
    throw new Error("Unable to extract REST namespaces from includes/config.php");
  }
  return {
    LEAN_STATS_REST_NAMESPACE: publicMatch[1],
    LEAN_STATS_REST_INTERNAL_NAMESPACE: internalMatch[1],
  };
};

const extractRestRoutesFromCode = () => {
  const namespaceMap = extractRestNamespaces();
  const restFiles = walk(path.join(ROOT, "includes"), [".php"])
    .filter((file) => file.includes(`${path.sep}rest${path.sep}`));
  const routes = new Set();

  restFiles.forEach((file) => {
    const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
    let inRoute = false;
    let namespaceConst = null;
    let routePath = null;
    let methods = [];

    const finalize = () => {
      if (namespaceConst && routePath && methods.length > 0) {
        const namespace = namespaceMap[namespaceConst];
        const normalizedPath = routePath.startsWith("/") ? routePath : `/${routePath}`;
        methods.forEach((method) => {
          routes.add(`${namespace} ${method} ${normalizedPath}`);
        });
      }
      inRoute = false;
      namespaceConst = null;
      routePath = null;
      methods = [];
    };

    lines.forEach((line) => {
      if (line.includes("register_rest_route")) {
        inRoute = true;
      }

      if (!inRoute) {
        return;
      }

      if (line.includes("LEAN_STATS_REST_NAMESPACE")) {
        namespaceConst = "LEAN_STATS_REST_NAMESPACE";
      }
      if (line.includes("LEAN_STATS_REST_INTERNAL_NAMESPACE")) {
        namespaceConst = "LEAN_STATS_REST_INTERNAL_NAMESPACE";
      }

      if (!routePath) {
        const pathMatch = line.match(/'([^']+)'/);
        if (pathMatch && pathMatch[1].startsWith("/")) {
          routePath = pathMatch[1];
        }
      }

      const methodMatch = line.match(/'methods'\s*=>\s*'([^']+)'/);
      if (methodMatch) {
        methods.push(methodMatch[1].toUpperCase());
      }

      if (line.includes(");")) {
        finalize();
      }
    });
  });

  return routes;
};

const extractRestRoutesFromDocs = () => {
  const content = readFile("docs/REST_API.md");
  const lines = content.split(/\r?\n/);
  let currentNamespace = null;
  const routes = new Set();

  lines.forEach((line) => {
    const namespaceMatch = line.match(/\*\*Namespace\*\*:\s*`([^`]+)`/);
    if (namespaceMatch) {
      currentNamespace = namespaceMatch[1];
      return;
    }

    const headingMatch = line.match(/^(###|####)\s+([A-Z]+)\s+`(\/[^`]+)`/);
    if (headingMatch && currentNamespace) {
      const method = headingMatch[2];
      const routePath = headingMatch[3];
      routes.add(`${currentNamespace} ${method} ${routePath}`);
    }
  });

  return routes;
};

const extractSchemaFromCode = () => {
  const schemaContent = readFile("db/schema.php");
  const tableMap = new Map();
  const tableRegex = /\$(\w+)_table\s*=\s*\$wpdb->prefix\s*\.\s*'([^']+)'/g;
  let match;
  while ((match = tableRegex.exec(schemaContent))) {
    tableMap.set(match[1], match[2]);
  }

  const schemaRegex = /\$(\w+)_schema\s*=\s*"CREATE TABLE \{\$(\w+)_table\} \(([\s\S]*?)\) \{\$charset_collate\};";/g;
  const schemaMap = new Map();
  while ((match = schemaRegex.exec(schemaContent))) {
    const tableVar = match[2];
    const tableName = tableMap.get(tableVar);
    if (!tableName) {
      continue;
    }
    const columnsBlock = match[3];
    const columns = new Set();
    columnsBlock.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("PRIMARY") || trimmed.startsWith("KEY")) {
        return;
      }
      const columnMatch = trimmed.match(/^([a-z_]+)\s+[A-Z]/);
      if (columnMatch) {
        columns.add(columnMatch[1]);
      }
    });
    schemaMap.set(tableName, columns);
  }

  return schemaMap;
};

const extractSchemaFromDocs = () => {
  const content = readFile("docs/DB_SCHEMA.md");
  const lines = content.split(/\r?\n/);
  const schema = new Map();
  let currentTable = null;
  let inColumns = false;

  lines.forEach((line) => {
    const tableMatch = line.match(/^###\s+`([^`]+)`/);
    if (tableMatch) {
      currentTable = tableMatch[1].replace(/^wp_/, "");
      schema.set(currentTable, new Set());
      inColumns = false;
      return;
    }

    if (!currentTable) {
      return;
    }

    if (line.startsWith("Columns:")) {
      inColumns = true;
      return;
    }

    if (line.startsWith("Indexes:")) {
      inColumns = false;
      return;
    }

    if (inColumns) {
      const columnMatch = line.match(/^- `([^`]+)`/);
      if (columnMatch) {
        schema.get(currentTable).add(columnMatch[1]);
      }
    }
  });

  return schema;
};

const errors = [];

const phpFiles = [
  path.join(ROOT, "lean-stats.php"),
  ...walk(path.join(ROOT, "admin"), [".php"]),
  ...walk(path.join(ROOT, "includes"), [".php"]),
  ...walk(path.join(ROOT, "rest"), [".php"]),
  ...walk(path.join(ROOT, "front"), [".php"]),
  ...walk(path.join(ROOT, "db"), [".php"]),
];

const hookNames = extractHooksFromCode(phpFiles);
const docHooks = extractHooksFromDocs();
for (const hook of docHooks) {
  if (!hookNames.has(hook)) {
    errors.push(`Unknown hook in docs: ${hook}`);
  }
}

const settingsKeys = extractSettingsFromCode();
const docSettings = extractSettingsFromDocs();
for (const key of docSettings) {
  if (!settingsKeys.has(key)) {
    errors.push(`Unknown settings key in docs: ${key}`);
  }
}

const codeRoutes = extractRestRoutesFromCode();
const docRoutes = extractRestRoutesFromDocs();
for (const route of docRoutes) {
  if (!codeRoutes.has(route)) {
    errors.push(`Unknown REST route in docs: ${route}`);
  }
}

const codeSchema = extractSchemaFromCode();
const docSchema = extractSchemaFromDocs();
for (const [table, columns] of docSchema.entries()) {
  if (!codeSchema.has(table)) {
    errors.push(`Unknown DB table in docs: ${table}`);
    continue;
  }
  const knownColumns = codeSchema.get(table);
  for (const column of columns) {
    if (!knownColumns.has(column)) {
      errors.push(`Unknown DB column in docs: ${table}.${column}`);
    }
  }
}

if (errors.length > 0) {
  console.error("Documentation consistency check failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Documentation consistency check passed.");
