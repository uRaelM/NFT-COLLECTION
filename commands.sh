#All did in WSL terminal

#Verifing Git
git --version

#Verifing Node
npm --version

#Install Solana 
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
#Verifing Solana
solana --version
solana-keygen --version 
solana-test-validator

#Install Sugar v2.7.1
# https://github.com/metaplex-foundation/sugar/releases/tag/sugar-cmv3-alpha.3
./sugar.exe --version


#Generate Owner Wallet
# pubkey: 4eTofWcWAeUpYdqfQdxt1N7VEwQNV7tHQNaHuKbK2X4Z
# control medal cousin device cat shove grow winner boat wife bargain distance
solana-keygen new --outfile '/mnt/c/Users/Rafael/Documents/Visual Studio 2024/NFT Collection/Owner.json'


#Generate Creator Wallet
# pubkey: AVpVzn38qKVzwwBMuNJqgEtQ6dQkvvgTd7JtKMRRbuL9
# shoe wagon wing gather find stumble unknown note correct grunt forget bachelor
solana-keygen new --outfile '/mnt/c/Users/Rafael/Documents/Visual Studio 2024/NFT Collection/Creator.json'

#Configuring Solana
solana config set --keypair  '/mnt/c/Users/Rafael/Documents/Visual Studio 2024/NFT Collection/Owner.json'
solana config set --url https://metaplex.devnet.rpcpool.com 
solana config get

#Airdroping Owner Sol
solana airdrop 1 4eTofWcWAeUpYdqfQdxt1N7VEwQNV7tHQNaHuKbK2X4Z --url https://api.devnet.solana.com

#Airdroping Creator Sol
solana airdrop 1 AVpVzn38qKVzwwBMuNJqgEtQ6dQkvvgTd7JtKMRRbuL9 --url https://api.devnet.solana.com


./sugar.exe create-config

./sugar.exe upload