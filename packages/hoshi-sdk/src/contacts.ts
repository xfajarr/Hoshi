import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { PublicKey } from '@solana/web3.js'
import { HoshiError } from './errors.js'

export interface Contact {
  name: string;
  address: string;
  label?: string;
}

export type ContactMap = Record<string, Contact>;

const RESERVED_NAMES = new Set(['all', 'to', 'from', 'address', 'send', 'transfer']);

export class ContactManager {
  private contacts: ContactMap = {};
  private readonly filePath: string;
  private readonly dir: string;

  constructor(configDir?: string) {
    this.dir = configDir ?? join(homedir(), '.hoshi');
    this.filePath = join(this.dir, 'contacts.json');
    this.load();
  }

  private load(): void {
    try {
      if (existsSync(this.filePath)) {
        this.contacts = JSON.parse(readFileSync(this.filePath, 'utf-8'));
      }
    } catch {
      this.contacts = {};
    }
  }

  private save(): void {
    if (!existsSync(this.dir)) {
      mkdirSync(this.dir, { recursive: true });
    }
    writeFileSync(this.filePath, JSON.stringify(this.contacts, null, 2));
  }

  add(name: string, address: string, label?: string): { action: 'added' | 'updated' } {
    this.validateName(name);
    this.validateAddress(address);

    const normalized = new PublicKey(address).toBase58();
    const key = name.toLowerCase();
    const existed = key in this.contacts;

    this.contacts[key] = { name, address: normalized, label };
    this.save();

    return { action: existed ? 'updated' : 'added' };
  }

  remove(name: string): boolean {
    const key = name.toLowerCase();
    if (!(key in this.contacts)) return false;

    delete this.contacts[key];
    this.save();
    return true;
  }

  get(name: string): Contact | undefined {
    this.load();
    return this.contacts[name.toLowerCase()];
  }

  list(): Contact[] {
    this.load();
    return Object.values(this.contacts);
  }

  resolve(nameOrAddress: string): { address: string; contactName?: string } {
    this.load();

    // Check if it's already a valid Solana address
    try {
      const pubkey = new PublicKey(nameOrAddress);
      return { address: pubkey.toBase58() };
    } catch {
      // Not a valid address, check contacts
    }

    const contact = this.contacts[nameOrAddress.toLowerCase()];
    if (contact) {
      return { address: contact.address, contactName: contact.name };
    }

    throw new HoshiError(
      'CONTACT_NOT_FOUND',
      `"${nameOrAddress}" is not a valid Solana address or saved contact. Add it: hoshi contacts add ${nameOrAddress} <address>`,
    );
  }

  private validateName(name: string): void {
    if (name.startsWith('0x')) {
      throw new HoshiError('INVALID_CONTACT_NAME', 'Contact names cannot start with 0x');
    }
    if (!/^[a-zA-Z0-9_]+$/.test(name)) {
      throw new HoshiError('INVALID_CONTACT_NAME', 'Contact names can only contain letters, numbers, and underscores');
    }
    if (name.length > 32) {
      throw new HoshiError('INVALID_CONTACT_NAME', 'Contact names must be 32 characters or fewer');
    }
    if (RESERVED_NAMES.has(name.toLowerCase())) {
      throw new HoshiError('INVALID_CONTACT_NAME', `"${name}" is a reserved name and cannot be used as a contact`);
    }
  }

  private validateAddress(address: string): void {
    try {
      new PublicKey(address);
    } catch {
      throw new HoshiError('INVALID_ADDRESS', `Invalid Solana address: ${address}`);
    }
  }
}