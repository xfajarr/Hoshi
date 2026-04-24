import { Command } from 'commander'
import { printJson, isJsonMode, printKeyValue, printBlank, printHeader, printDivider, printSuccess, printInfo } from '../output.js'
import { loadConfig, saveConfig } from '../config.js'

export const registerContacts = (program: Command): void => {
  const contacts = program.command('contacts').description('Manage saved recipients')

  contacts
    .command('list')
    .description('List saved contacts')
    .action(() => {
      const config = loadConfig()
      const contactsList = (config.contacts as Record<string, { address: string; label?: string }>) ?? {}

      const entries = Object.entries(contactsList)

      if (isJsonMode()) {
        printJson({ contacts: entries.map(([name, data]) => ({ name, ...data })) })
        return
      }

      printBlank()
      if (entries.length === 0) {
        printInfo('No contacts saved. Add one with: hoshi contacts add <name> <address>')
        printBlank()
        return
      }

      printHeader('Saved Contacts')
      printDivider()

      for (const [name, data] of entries) {
        printKeyValue(name, data.address)
        if (data.label) {
          printKeyValue('  Label', data.label)
        }
      }
      printBlank()
    })

  contacts
    .command('add')
    .description('Add a contact')
    .argument('<name>', 'Contact name')
    .argument('<address>', 'Solana address')
    .option('-l, --label <label>', 'Optional label')
    .action((name, address, options) => {
      const config = loadConfig()
      const contactsList = (config.contacts as Record<string, { address: string; label?: string }>) ?? {}

      contactsList[name] = {
        address,
        label: options.label,
      }

      config.contacts = contactsList
      saveConfig(config)

      printSuccess(`Contact "${name}" added`)
      printBlank()
    })

  contacts
    .command('remove')
    .description('Remove a contact')
    .argument('<name>', 'Contact name')
    .action((name: string) => {
      const config = loadConfig()
      const contactsList = (config.contacts as Record<string, { address: string; label?: string }>) ?? {}

      if (!contactsList[name]) {
        throw new Error(`Contact "${name}" not found`)
      }

      delete contactsList[name]
      config.contacts = contactsList
      saveConfig(config)

      printSuccess(`Contact "${name}" removed`)
      printBlank()
    })
}