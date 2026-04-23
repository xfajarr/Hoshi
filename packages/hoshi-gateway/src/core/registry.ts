import type { Service } from './types.js'

export interface ServiceRegistry {
  register(service: Service): void
  get(id: string): Service | undefined
  list(): Service[]
  findEndpoint(serviceId: string, path: string): { service: Service; endpoint: Service['endpoints'][number] } | undefined
}

export class InMemoryServiceRegistry implements ServiceRegistry {
  private services = new Map<string, Service>()

  register(service: Service): void {
    this.services.set(service.id, service)
  }

  get(id: string): Service | undefined {
    return this.services.get(id)
  }

  list(): Service[] {
    return Array.from(this.services.values())
  }

  findEndpoint(serviceId: string, path: string): { service: Service; endpoint: Service['endpoints'][number] } | undefined {
    const service = this.services.get(serviceId)
    if (!service) return undefined
    const endpoint = service.endpoints.find(e => e.path === path)
    if (!endpoint) return undefined
    return { service, endpoint }
  }
}
