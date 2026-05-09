import * as anchor from '@coral-xyz/anchor'
import { Program } from '@coral-xyz/anchor'
import { expect } from 'chai'

describe('hoshi-kya', () => {
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)
  const program = anchor.workspace.HoshiKya as Program

  const registryConfigPda = () =>
    anchor.web3.PublicKey.findProgramAddressSync([Buffer.from('registry')], program.programId)[0]

  const identityPda = (handle: string) =>
    anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('identity'), Buffer.from(handle)],
      program.programId
    )[0]

  const walletIndexPda = (owner: anchor.web3.PublicKey) =>
    anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('wallet'), owner.toBuffer()],
      program.programId
    )[0]

  it('applies direct reputation deltas only from Hoshi authority', async () => {
    const hoshiIssuer = anchor.web3.Keypair.generate()
    const wallet = anchor.web3.Keypair.generate()

    const registryConfig = registryConfigPda()
    await program.methods
      .initializeRegistry(hoshiIssuer.publicKey)
      .accounts({
        authority: provider.wallet.publicKey,
        registryConfig,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc()

    const sig = await provider.connection.requestAirdrop(
      wallet.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    )
    await provider.connection.confirmTransaction(sig, 'confirmed')

    const handle = 'namaagent.hoshi'
    const identity = identityPda(handle)
    const walletIndex = walletIndexPda(wallet.publicKey)

    await program.methods
      .claimHandle(handle, 'Nama Agent', null)
      .accounts({
        owner: wallet.publicKey,
        identity,
        walletIndex,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([wallet])
      .rpc()

    const tx1 = await program.methods
      .updateReputation(handle, new anchor.BN(5), 'payment.completed', null)
      .accounts({
        registryConfig,
        hoshiSigner: hoshiIssuer.publicKey,
        identity,
      })
      .signers([hoshiIssuer])
      .rpc()

    expect(tx1).to.be.a('string')

    const updatedIdentity = await program.account.identityAccount.fetch(identity)
    expect(updatedIdentity.reputationScore.toNumber()).to.equal(5)

    const unauthorizedSigner = anchor.web3.Keypair.generate()
    let rejected = false
    try {
      await program.methods
        .updateReputation(handle, new anchor.BN(3), 'payment.completed', null)
        .accounts({
          registryConfig,
          hoshiSigner: unauthorizedSigner.publicKey,
          identity,
        })
        .signers([unauthorizedSigner])
        .rpc()
    } catch (_error) {
      rejected = true
    }

    expect(rejected).to.eq(true)
  })

  it('resolves the onchain profile shape', async () => {
    const hoshiIssuer = anchor.web3.Keypair.generate()
    const wallet = anchor.web3.Keypair.generate()

    const registryConfig = registryConfigPda()
    await program.methods
      .initializeRegistry(hoshiIssuer.publicKey)
      .accounts({
        authority: provider.wallet.publicKey,
        registryConfig,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc()

    const sig = await provider.connection.requestAirdrop(
      wallet.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    )
    await provider.connection.confirmTransaction(sig, 'confirmed')

    const handle = 'namaagent.hoshi'
    const identity = identityPda(handle)
    const walletIndex = walletIndexPda(wallet.publicKey)

    await program.methods
      .claimHandle(handle, 'Nama Agent', 'https://example.com/meta.json')
      .accounts({
        owner: wallet.publicKey,
        identity,
        walletIndex,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([wallet])
      .rpc()

    const resolveTx = await program.methods.resolveHandle().accounts({ identity }).rpc()
    expect(resolveTx).to.be.a('string')

    const account = await program.account.identityAccount.fetch(identity)
    expect(account.handle).to.equal(handle)
    expect(account.displayName).to.equal('Nama Agent')
    expect(account.metadataUri).to.equal('https://example.com/meta.json')
    expect(account.owner.toBase58()).to.equal(wallet.publicKey.toBase58())
    expect(account.reputationScore.toNumber()).to.equal(0)
    expect(account.attestationCount.toNumber()).to.equal(0)
  })
})
