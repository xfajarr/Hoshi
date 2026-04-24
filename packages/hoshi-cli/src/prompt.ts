export const promptSecret = async (label: string): Promise<string> => {
  if (!process.stdin.isTTY) {
    throw new Error('Interactive password prompt requires a TTY. Set HOSHI_WALLET_PASSWORD for headless use.')
  }

  return new Promise((resolve, reject) => {
    let value = ''

    const cleanup = () => {
      process.stdin.setRawMode(false)
      process.stdin.pause()
      process.stdin.removeListener('data', onData)
      process.stdout.write('\n')
    }

    const onData = (chunk: Buffer | string) => {
      const input = typeof chunk === 'string' ? chunk : chunk.toString('utf8')

      if (input === '\u0003') {
        cleanup()
        reject(new Error('Password prompt cancelled'))
        return
      }

      if (input === '\r' || input === '\n') {
        cleanup()
        resolve(value)
        return
      }

      if (input === '\u007f') {
        value = value.slice(0, -1)
        return
      }

      value += input
    }

    process.stdout.write(label)
    process.stdin.resume()
    process.stdin.setRawMode(true)
    process.stdin.on('data', onData)
  })
}
