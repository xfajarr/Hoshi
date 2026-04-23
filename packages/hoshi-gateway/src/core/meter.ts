import type { MeteredRequest } from './types.js'

export interface Meter {
  record(request: MeteredRequest): void
  getRequest(id: string): MeteredRequest | undefined
  listRequests(serviceId?: string): MeteredRequest[]
  getStats(): { totalRequests: number; totalRevenue: string }
}

export class InMemoryMeter implements Meter {
  private requests = new Map<string, MeteredRequest>()

  record(request: MeteredRequest): void {
    this.requests.set(request.id, request)
  }

  getRequest(id: string): MeteredRequest | undefined {
    return this.requests.get(id)
  }

  listRequests(serviceId?: string): MeteredRequest[] {
    const items = Array.from(this.requests.values())
    if (serviceId) {
      return items.filter(r => r.serviceId === serviceId)
    }
    return items
  }

  getStats(): { totalRequests: number; totalRevenue: string } {
    const totalRequests = this.requests.size
    let totalRevenue = BigInt(0)
    for (const req of this.requests.values()) {
      if (req.paymentProof) {
        totalRevenue += BigInt(req.paymentProof.amount)
      }
    }
    return { totalRequests, totalRevenue: totalRevenue.toString() }
  }
}
