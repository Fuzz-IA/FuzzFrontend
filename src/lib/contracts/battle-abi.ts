import { ethers } from 'ethers';
export const BATTLE_ADDRESS = '0xA8c1d130f665a8F1e1faa45a783328c3f68a38bc' as const;
export const TOKEN_ADDRESS = '0x4abC7399ae24038122d5A549A7FFe1be57748946' as const;

export const BATTLE_ABI = [{"inputs":[{"internalType":"address","name":"_tokenAddress","type":"address"},{"internalType":"address","name":"_agentA","type":"address"},{"internalType":"address","name":"_agentB","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[{"internalType":"address","name":"user","type":"address"},{"internalType":"uint256","name":"gameId","type":"uint256"}],"name":"AlreadyVoted","type":"error"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"admin","type":"address"}],"name":"AdminAdded","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"admin","type":"address"}],"name":"AdminRemoved","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"newAmount","type":"uint256"}],"name":"BasePromptBetAmountUpdated","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"participationFee","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"winnerFee","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"devFee","type":"uint256"}],"name":"FeesUpdated","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"winner","type":"address"},{"indexed":false,"internalType":"uint256","name":"totalAmount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"gameId","type":"uint256"}],"name":"GameEnded","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"newGameId","type":"uint256"}],"name":"GameReset","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"newAmount","type":"uint256"}],"name":"MinBetAmountUpdated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"bool","name":"isAgentA","type":"bool"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"promptId","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"gameId","type":"uint256"}],"name":"PromptBet","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"bool","name":"isAgentA","type":"bool"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"gameId","type":"uint256"}],"name":"SimpleBet","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"WinningsDistributed","type":"event"},{"inputs":[],"name":"FEE_DENOMINATOR","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"RATIO_PRECISION","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_admin","type":"address"}],"name":"addAdmin","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"admins","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"agentA","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"agentB","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"basePromptBetAmount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bool","name":"_isAgentA","type":"bool"},{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"betOnAgent","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bool","name":"_isAgentA","type":"bool"},{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"betWithPrompt","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bool","name":"isAgentA","type":"bool"}],"name":"calculatePromptBetAmount","outputs":[{"internalType":"uint256","name":"requiredAmount","type":"uint256"},{"internalType":"uint256","name":"ratio","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"currentGameId","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"devFeePercentage","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bool","name":"_isAgentAWinner","type":"bool"}],"name":"endGame","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"gameEnded","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"uint256","name":"","type":"uint256"}],"name":"gameParticipants","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"uint256","name":"","type":"uint256"}],"name":"gamePrompts","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getCurrentGamePrompts","outputs":[{"components":[{"internalType":"bool","name":"isAgentA","type":"bool"},{"internalType":"uint256","name":"votes","type":"uint256"},{"internalType":"bool","name":"exists","type":"bool"},{"internalType":"address","name":"creator","type":"address"},{"internalType":"uint256","name":"gameId","type":"uint256"}],"internalType":"struct FuzzBetting.Prompt[]","name":"","type":"tuple[]"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_gameId","type":"uint256"}],"name":"getGamePrompts","outputs":[{"components":[{"internalType":"bool","name":"isAgentA","type":"bool"},{"internalType":"uint256","name":"votes","type":"uint256"},{"internalType":"bool","name":"exists","type":"bool"},{"internalType":"address","name":"creator","type":"address"},{"internalType":"uint256","name":"gameId","type":"uint256"}],"internalType":"struct FuzzBetting.Prompt[]","name":"","type":"tuple[]"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getMarketInfo","outputs":[{"internalType":"uint256","name":"sideARatio","type":"uint256"},{"internalType":"uint256","name":"sideBRatio","type":"uint256"},{"internalType":"uint256","name":"costForSideA","type":"uint256"},{"internalType":"uint256","name":"costForSideB","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_promptId","type":"uint256"}],"name":"getPrompt","outputs":[{"components":[{"internalType":"bool","name":"isAgentA","type":"bool"},{"internalType":"uint256","name":"votes","type":"uint256"},{"internalType":"bool","name":"exists","type":"bool"},{"internalType":"address","name":"creator","type":"address"},{"internalType":"uint256","name":"gameId","type":"uint256"}],"internalType":"struct FuzzBetting.Prompt","name":"","type":"tuple"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getTotalAcumulated","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_user","type":"address"},{"internalType":"uint256","name":"_gameId","type":"uint256"}],"name":"getUserContribution","outputs":[{"internalType":"uint256","name":"forA","type":"uint256"},{"internalType":"uint256","name":"forB","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_user","type":"address"},{"internalType":"uint256","name":"_gameId","type":"uint256"}],"name":"hasUserVoted","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"address","name":"","type":"address"}],"name":"hasVoted","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"address","name":"","type":"address"}],"name":"isParticipant","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"minBetAmount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"participationFeePercentage","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"promptCounter","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"prompts","outputs":[{"internalType":"bool","name":"isAgentA","type":"bool"},{"internalType":"uint256","name":"votes","type":"uint256"},{"internalType":"bool","name":"exists","type":"bool"},{"internalType":"address","name":"creator","type":"address"},{"internalType":"uint256","name":"gameId","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"renounceOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"resetGame","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_newAmount","type":"uint256"}],"name":"setBasePromptBetAmount","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_newAmount","type":"uint256"}],"name":"setMinBetAmount","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"token","outputs":[{"internalType":"contract IERC20","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalAgentA","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalAgentB","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_participationFee","type":"uint256"},{"internalType":"uint256","name":"_winnerFee","type":"uint256"},{"internalType":"uint256","name":"_devFee","type":"uint256"}],"name":"updateFees","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"address","name":"","type":"address"}],"name":"userToAgentAByGame","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"address","name":"","type":"address"}],"name":"userToAgentBByGame","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"winnerFeePercentage","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}]


export const TOKEN_ABI = [
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function mint() public returns (bool)"
] as const;


export const BETTING_AMOUNT = ethers.utils.parseUnits("2000", 18)

export type BattleContract = {
  address: typeof BATTLE_ADDRESS;
  abi: typeof BATTLE_ABI;
}; 



