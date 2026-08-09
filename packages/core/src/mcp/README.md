# MCP Renderer Plugin System

The MCP renderer system provides a pluggable architecture for rendering MCP server configurations in different formats (JSON, TOML, YAML, XML, etc.).

## Overview

Renderers convert MCP server definitions from the internal `WsMcpSchema` format into agent-specific configuration file formats. Each renderer implements the `McpRenderer` interface and is registered with the renderer registry.

## Built-in Renderers

The system includes three built-in renderers:

- **json-map**: Renders MCP configs as JSON objects (e.g., Claude Desktop config)
- **toml-table**: Renders MCP configs as TOML tables (e.g., some Rust-based agents)
- **yaml**: Renders MCP configs as YAML (e.g., Kubernetes-style configs)
- **xml**: Renders MCP configs as XML (demonstrates extensibility)

## Creating a Custom Renderer

To create a custom renderer, implement the `McpRenderer` interface:

```typescript
import type { McpRenderer } from '@ws/core';
import type { WsMcpSchema, AgentTemplate } from '@ws/core';

export const myCustomRenderer: McpRenderer = {
  render(mcp: WsMcpSchema, template: AgentTemplate): string {
    // Convert MCP schema to your custom format
    const field = template.mcpField ?? 'mcpServers';
    
    // Example: generate custom format
    const lines: string[] = [];
    lines.push(`# Custom format for ${mcp.name}`);
    
    if (mcp.transport === 'stdio') {
      if (mcp.command) {
        lines.push(`command: ${mcp.command}`);
      }
      if (mcp.args && mcp.args.length > 0) {
        lines.push(`args: ${mcp.args.join(' ')}`);
      }
    } else {
      if (mcp.url) {
        lines.push(`url: ${mcp.url}`);
      }
    }
    
    if (mcp.env && Object.keys(mcp.env).length > 0) {
      lines.push('env:');
      for (const [key, value] of Object.entries(mcp.env)) {
        // Transform env:VAR references to your format
        const transformed = value.replace(/^env:(.+)$/, '${env:$1}');
        lines.push(`  ${key}: ${transformed}`);
      }
    }
    
    return lines.join('\n') + '\n';
  },

  parse(content: string, field: string): Record<string, unknown> {
    // Parse your custom format back to a record of MCP entries
    // This is used for reverse scanning and consistency checks
    const result: Record<string, unknown> = {};
    
    // Example: parse custom format
    const lines = content.split('\n');
    let currentName: string | null = null;
    let currentEntry: Record<string, unknown> | null = null;
    
    for (const line of lines) {
      // Parse logic here...
    }
    
    return result;
  },
};
```

## Registering a Custom Renderer

Register your renderer with the renderer registry:

```typescript
import { registerRenderer } from '@ws/core';
import { myCustomRenderer } from './my-custom-renderer.js';

// Register with a unique format name
registerRenderer('my-custom-format', myCustomRenderer);
```

## Using a Custom Renderer

Custom renderers are automatically used when:

1. An agent template specifies `targetFormat: 'my-custom-format'`
2. The agent's `mcpFile` extension matches your format (if you update `detectFormat`)

### Example Agent Template

```json
{
  "id": "my-agent",
  "configDirName": ".my-agent",
  "mcpFile": "config.custom",
  "mcpField": "servers",
  "targetFormat": "my-custom-format"
}
```

## Environment Variable Transformation

When rendering environment variables, you should transform `env:VAR` references to your format's syntax:

```typescript
function transformEnvValue(value: string): string {
  const envMatch = value.match(/^env:(.+)$/);
  if (!envMatch) return value;
  
  const varName = envMatch[1];
  
  // Transform to your format's env syntax
  // Examples:
  // - Shell: ${VAR}
  // - JavaScript: process.env.VAR
  // - Custom: {{env:VAR}}
  
  return `\${env:${varName}}`;
}
```

## Renderer Registry API

- `registerRenderer(format: string, renderer: McpRenderer)`: Register a renderer
- `getRenderer(format: string)`: Get a renderer by format name
- `listRenderers()`: List all registered format names

## Testing Your Renderer

Test your renderer by:

1. Creating a test MCP server with various configurations
2. Applying it to an agent using your custom format
3. Verifying the output file matches your expected format
4. Testing the `parse` method by reverse-scanning the generated file

Example test:

```typescript
import { renderMcpForAgent } from '@ws/core';
import { myCustomRenderer } from './my-custom-renderer.js';

const mcp: WsMcpSchema = {
  name: 'test-server',
  transport: 'stdio',
  command: 'node',
  args: ['server.js'],
  env: { API_KEY: 'env:API_KEY' },
};

const template: AgentTemplate = {
  id: 'test-agent',
  configDirName: '.test',
  mcpFile: 'config.custom',
  mcpField: 'servers',
  targetFormat: 'my-custom-format',
};

const output = myCustomRenderer.render(mcp, template);
console.log(output);
```

## Best Practices

1. **Handle all transport types**: Support both `stdio` and `sse`/`http` transports
2. **Transform env vars**: Convert `env:VAR` references to your format's syntax
3. **Implement parse**: The `parse` method is required for reverse scanning
4. **Escape special characters**: Properly escape strings for your format
5. **Preserve formatting**: Use consistent indentation and line breaks
6. **Test edge cases**: Empty args, no env vars, special characters in values

## Examples

See the built-in renderers for complete examples:

- `packages/core/src/mcp/renderer-registry.ts` (JSON and TOML)
- `packages/core/src/mcp/renderers/yaml-renderer.ts` (YAML)
- `packages/core/src/mcp/renderers/xml-renderer.ts` (XML)
