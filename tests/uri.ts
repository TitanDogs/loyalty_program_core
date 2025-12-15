import { mplCore } from '@metaplex-foundation/mpl-core'
import { generateSigner, keypairIdentity, signerIdentity } from '@metaplex-foundation/umi'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { irysUploader } from '@metaplex-foundation/umi-uploader-irys'

const main = async () => {
    const umi = createUmi('https://api.devnet.solana.com')
        .use(mplCore())
        .use(
            irysUploader()
        )
    const signer = generateSigner(umi)

    umi.use(signerIdentity(signer))

    await umi.rpc.airdrop(umi.identity.publicKey, {
        basisPoints: BigInt(1),
        identifier: "SOL",
        decimals: 9,
    });

    const metadata = {
        name: 'My NFT',
        description: 'This is an NFT on Solana',
        image: 'https://avatars.githubusercontent.com/u/100630448?s=200&v=4',
        external_url: 'https://example.com',
        attributes: [
            {
                trait_type: 'trait1',
                value: 'value1',
            },
            {
                trait_type: 'trait2',
                value: 'value2',
            },
        ],
        properties: {
            files: [
                {
                    uri: 'https://avatars.githubusercontent.com/u/100630448?s=200&v=4',
                    type: 'image/jpeg',
                },
            ],
            category: 'image',
        },
    }

    const metadataUri = await umi.uploader.uploadJson(metadata).catch((err) => {
        throw new Error(err)
    })

    console.log(metadataUri);
}

main();