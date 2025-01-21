Program Id: 9YgG362xAfmHsKdewgEVSRs8QQnTHqjE5ir4QCejJeqn

Signature: 59GtjYBxLP7JHtEot33HTwY4jZnDBMUPEr2GY69ZVf1e6ct9bnksYS9CgcAUjve5SPVSPA8kLY8SWVg8xPX4hPfg

solana-keygen new -o seller.json


BIP39 Passphrase (empty for none): 

Wrote new keypair to seller.json
=============================================================================
pubkey: vV6Vu7gzbEDxRRDXT1XJBMjXjZrS5o2pFVTjCzG6zGW
=============================================================================
Save this seed phrase and your BIP39 passphrase to recover your new keypair:
gloom reopen position smoke adapt crucial dumb shaft skill afraid palm orange
=============================================================================

solana config set --keypair /Users/johndoe/.config/solana/id.json --url localhost
5oX13vcBV6eNkR12GFE5jeUq2H78cFmsfRJmYdJUHisR

SELLER_PUBLIC_KEY 5oX13vcBV6eNkR12GFE5jeUq2H78cFmsfRJmYdJUHisR

seller private key

3oLLPKtdTYnRG4WtheechQaVx5nkzZFun5dccRwxmdah3bWxmx339DJ8itTxh3Cw2oreW1kKj9dPx1T2meWjiANK

phantom wallet:

BUYER_PUBLIC_KEY=CrD61ap1Jb3yUGtHat7sGMVd65CssAExHPK3UptC3vAw
BUYER_PRIVATE_KEY=65C4U66ut7JVuEsGAywdCDpsEY2VNxGFNgFS1TqnajSyd8KfzpXB3XkDc2aqasDguZQkhG4vwXSiuqUsBkCAfXa3


spl-token create-token --decimals 2
Creating token 89GTvLDGLy7UBPyUd1rYQMgS1iixG7vR4zTTbvfP6jRu under program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA

Address:  89GTvLDGLy7UBPyUd1rYQMgS1iixG7vR4zTTbvfP6jRu
Decimals:  2

Create and save the sellers token account:

$ spl-token create-account <TOKEN_MINT_ADDRESS>

spl-token create-account 89GTvLDGLy7UBPyUd1rYQMgS1iixG7vR4zTTbvfP6jRu
Creating account GtnVWPM8ccHb1UwHwFywTjbEAS2vXFbmArVdNatXmQmW

Signature: 5mijtrmSEzckxNPytHderA8S5mePzvtaXW5QDrPEg1W5bFMic7vEHhBDqoranvQhZdg1CorUy4YAKgSCsLCLiosA





env

CUSTOM_PROGRAM_ID=9YgG362xAfmHsKdewgEVSRs8QQnTHqjE5ir4QCejJeqn
SELLER_PUBLIC_KEY=5oX13vcBV6eNkR12GFE5jeUq2H78cFmsfRJmYdJUHisR
SELLER_PRIVATE_KEY=3oLLPKtdTYnRG4WtheechQaVx5nkzZFun5dccRwxmdah3bWxmx339DJ8itTxh3Cw2oreW1kKj9dPx1T2meWjiANK
BUYER_PUBLIC_KEY=CrD61ap1Jb3yUGtHat7sGMVd65CssAExHPK3UptC3vAw
BUYER_PRIVATE_KEY=65C4U66ut7JVuEsGAywdCDpsEY2VNxGFNgFS1TqnajSyd8KfzpXB3XkDc2aqasDguZQkhG4vwXSiuqUsBkCAfXa3
TOKEN_PUBKEY=89GTvLDGLy7UBPyUd1rYQMgS1iixG7vR4zTTbvfP6jRu
TOKEN_DECIMAL=2
RPCURL=http://localhost:8899
API_URL=http://localhost:3000
TOKEN_SALE_PRICE=0.01
TOKEN_MIN_BUY=100
SELLER_TOKEN_ACCOUNT_PUBKEY=GtnVWPM8ccHb1UwHwFywTjbEAS2vXFbmArVdNatXmQmW
TEMP_TOKEN_ACCOUNT_PUBKEY=EejCVsEsFXZj9GkBgKYKUCRYepspHttmKCTjZYj1rfL1
TOKEN_SALE_PROGRAM_ACCOUNT_PUBKEY=9W5uMycGCMAGoWePQF9b8fRbBXZ59smDgbkWExtU76kz
