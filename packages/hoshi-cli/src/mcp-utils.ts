import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { homedir, platform } from 'os'

export interface McpPlatform {
  name: string
  path: string
}

const MCP_CONFIG = {
  command: 'hoshi',
  args: ['mcp'],
}

export const getMcpPlatforms = (): McpPlatform[] => {
  const home = homedir()
  const isMac = platform() === 'darwin'

  return [
    {
      name: 'Claude Desktop',
      path: isMac
        ? join(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json')
        : join(home, 'AppData', 'Roaming', 'Claude', 'claude_desktop_config.json'),
    },
    {
      name: 'Cursor',
      path: join(home, '.cursor', 'mcp.json'),
    },
    {
      name: 'Windsurf',
      path: join(home, '.codeium', 'windsurf', 'mcp_config.json'),
    },
  ]
}

export const getMcpConfig = (): typeof MCP_CONFIG => MCP_CONFIG

export const readMcpConfigFile = (path: string): Record<string, unknown> => {
  try {
    return JSON.parse(readFileSync(path, 'utf-8'))
  } catch {
    return {}
  }
}

export const writeMcpConfigFile = (path: string, data: Record<string, unknown>): void => {
  const dir = dirname(path)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n')
}

export const isMcpInstalled = (platform: McpPlatform): boolean => {
  const config = readMcpConfigFile(platform.path)
  const servers = config.mcpServers as Record<string, unknown> | undefined
  return !!(servers && servers.hoshi)
}

export const installMcpForPlatform = (platform: McpPlatform): boolean => {
  if (isMcpInstalled(platform)) {
    return false // already installed
  }

  const config = readMcpConfigFile(platform.path)
  config.mcpServers = {
    ...(config.mcpServers as Record<string, unknown> ?? {}),
    hoshi: MCP_CONFIG,
  }
  writeMcpConfigFile(platform.path, config)
  return true
}

export const uninstallMcpFromPlatform = (platform: McpPlatform): boolean => {
  if (!isMcpInstalled(platform)) {
    return false
  }

  const config = readMcpConfigFile(platform.path)
  delete (config.mcpServers as Record<string, unknown>).hoshi
  writeMcpConfigFile(platform.path, config)
  return true
}

export const installMcpForPlatforms = async (platforms: McpPlatform[]): Promise<{ name: string; status: 'added' | 'exists' }[]> => {
  const results: { name: string; status: 'added' | 'exists' }[] = []

  for (const platform of platforms) {
    const installed = installMcpForPlatform(platform)
    results.push({ name: platform.name, status: installed ? 'added' : 'exists' })
  }

  return results
}

export const uninstallMcpFromPlatforms = async (
  platforms: McpPlatform[],
): Promise<{ name: string; removed: boolean }[]> => {
  const results: { name: string; removed: boolean }[] = []

  for (const platform of platforms) {
    const removed = uninstallMcpFromPlatform(platform)
    results.push({ name: platform.name, removed })
  }

  return results
}