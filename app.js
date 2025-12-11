// Scores (local UI state)
let userScore = 0;
let computerScore = 0;

// DOM references
const userScore_span = document.getElementById('user-score');
const computerScore_span = document.getElementById('computer-score');
const result_p = document.querySelector('.result > p');
const rock_div = document.getElementById('r');
const paper_div = document.getElementById('p');
const scissors_div = document.getElementById('s');
const statusEl = document.getElementById('status');
const historyListEl = document.getElementById('history');

// Blockchain contract details
const contractAddress = "0x2f024AEABb13E62B67af7262e5e614ABa2Decc0b";
const contractABI = [
	{
		"inputs": [
			{
				"internalType": "enum RockPaperScissors.Move",
				"name": "_playerMove",
				"type": "uint8"
			}
		],
		"name": "play",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			},
			{
				"internalType": "string",
				"name": "",
				"type": "string"
			}
		],
		"stateMutability": "payable",
		"type": "function"
	},
	{
		"inputs": [],
		"stateMutability": "payable",
		"type": "constructor"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "player",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "enum RockPaperScissors.Move",
				"name": "playerMove",
				"type": "uint8"
			},
			{
				"indexed": false,
				"internalType": "enum RockPaperScissors.Move",
				"name": "computerMove",
				"type": "uint8"
			},
			{
				"indexed": false,
				"internalType": "bool",
				"name": "playerWon",
				"type": "bool"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "bet",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "string",
				"name": "message",
				"type": "string"
			}
		],
		"name": "Played",
		"type": "event"
	},
	{
		"stateMutability": "payable",
		"type": "receive"
	},
	{
		"inputs": [],
		"name": "BET_AMOUNT",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "player",
				"type": "address"
			}
		],
		"name": "getHistory",
		"outputs": [
			{
				"components": [
					{
						"internalType": "enum RockPaperScissors.Move",
						"name": "playerMove",
						"type": "uint8"
					},
					{
						"internalType": "enum RockPaperScissors.Move",
						"name": "computerMove",
						"type": "uint8"
					},
					{
						"internalType": "bool",
						"name": "playerWon",
						"type": "bool"
					},
					{
						"internalType": "uint256",
						"name": "bet",
						"type": "uint256"
					},
					{
						"internalType": "uint256",
						"name": "timestamp",
						"type": "uint256"
					},
					{
						"internalType": "string",
						"name": "message",
						"type": "string"
					}
				],
				"internalType": "struct RockPaperScissors.GameResult[]",
				"name": "",
				"type": "tuple[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "history",
		"outputs": [
			{
				"internalType": "enum RockPaperScissors.Move",
				"name": "playerMove",
				"type": "uint8"
			},
			{
				"internalType": "enum RockPaperScissors.Move",
				"name": "computerMove",
				"type": "uint8"
			},
			{
				"internalType": "bool",
				"name": "playerWon",
				"type": "bool"
			},
			{
				"internalType": "uint256",
				"name": "bet",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "timestamp",
				"type": "uint256"
			},
			{
				"internalType": "string",
				"name": "message",
				"type": "string"
			}
		],
		"stateMutability": "view",
		"type": "function"
	}
];

// Wallet connection
async function connectWallet() {
  if (!window.ethereum) {
    alert("MetaMask not found. Please install it.");
    return;
  }
  try {
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    document.getElementById("connectBtn").innerText = "Connected: " + accounts[0];
    console.log("Wallet connected:", accounts[0]);
    await refreshHistory(); // load history on connect
    await showBetAmount();  // show current bet from contract
  } catch (err) {
    console.error("User rejected connection", err);
  }
}
document.getElementById("connectBtn").addEventListener("click", connectWallet);

// Helper: get contract, provider, signer
async function getContract() {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const contract = new ethers.Contract(contractAddress, contractABI, signer);
  return { provider, signer, contract };
}

// Show bet amount from contract
async function showBetAmount() {
  try {
    const { contract } = await getContract();
    const betWei = await contract.BET_AMOUNT();
    const betEth = ethers.formatEther(betWei);
    const betEl = document.getElementById("bet");
    if (betEl) {
      betEl.innerText = `Bet: ${betEth} ETH`;
    }
  } catch (err) {
    console.warn("Could not fetch BET_AMOUNT:", err.message);
  }
}

// Blockchain play
async function playOnChain(playerChoiceIndex) {
  try {
    const { signer, contract } = await getContract();

    // Read exact BET from contract to avoid mismatches
    const betWei = await contract.BET_AMOUNT();

    statusEl.innerText = "Sending transaction...";
    const tx = await contract.play(playerChoiceIndex, { value: betWei });
    statusEl.innerText = "Waiting for confirmation...";
    const receipt = await tx.wait();
    statusEl.innerText = `Transaction confirmed in block ${receipt.blockNumber}`;

    // Fetch and render on-chain history
    await refreshHistory();
  } catch (err) {
    console.error(err);
    statusEl.innerText = "Error: " + (err.reason || err.message);
  }
}

// Fetch and render history for connected user
async function refreshHistory() {
  try {
    const { signer, contract } = await getContract();
    const addr = await signer.getAddress();
    const historyData = await contract.getHistory(addr);

    historyListEl.innerHTML = "";
    if (!historyData || historyData.length === 0) {
      historyListEl.innerHTML = "<li>No games yet.</li>";
      return;
    }

    historyData.forEach((entry, i) => {
      const li = document.createElement("li");
      const pm = moveToWord(entry.playerMove);
      const cm = moveToWord(entry.computerMove);
      const won = entry.playerWon ? "WIN" : (entry.message.includes("Draw") ? "DRAW" : "LOSS");
      const betEth = ethers.formatEther(entry.bet);
      const time = new Date(Number(entry.timestamp) * 1000).toLocaleString();

      li.textContent = `${i + 1}. ${time} | You: ${pm} vs Computer: ${cm} | ${won} | Bet ${betEth} ETH | ${entry.message}`;
      historyListEl.appendChild(li);
    });
  } catch (err) {
    console.warn("Could not refresh history:", err.message);
  }
}

// Local RPS logic (for instant UI feedback)
function getComputerChoice() {
  const choices = ['r', 'p', 's'];
  const randomNumber = Math.floor(Math.random() * 3);
  return choices[randomNumber];
}
function convertToWord(letter) {
  if (letter === 'r') return "Rock";
  if (letter === 'p') return "Paper";
  return "Scissors";
}
function win(userChoice, computerChoice) {
  userScore++;
  userScore_span.innerHTML = userScore;
  computerScore_span.innerHTML = computerScore;
  result_p.innerHTML = `${convertToWord(userChoice)} beats ${convertToWord(computerChoice)}. You win!`;
}
function lose(userChoice, computerChoice) {
  computerScore++;
  userScore_span.innerHTML = userScore;
  computerScore_span.innerHTML = computerScore;
  result_p.innerHTML = `${convertToWord(userChoice)} loses to ${convertToWord(computerChoice)}. You lost...`;
}
function draw(userChoice, computerChoice) {
  result_p.innerHTML = `${convertToWord(userChoice)} equals ${convertToWord(computerChoice)}. It's a draw.`;
}

// Map UI letters to contract enum indices (Solidity: None=0, Rock=1, Paper=2, Scissors=3)
const moveMap = { r: 1, p: 2, s: 3 };
function moveToWord(enumValue) {
  // enumValue is 1..3 here; align with Solidity
  if (enumValue === 1) return "Rock";
  if (enumValue === 2) return "Paper";
  if (enumValue === 3) return "Scissors";
  return "None";
}

// Unified game handler: local UI + on-chain play
function game(userChoice) {
  const computerChoice = getComputerChoice();
  switch (userChoice + computerChoice) {
    case 'rs':
    case 'pr':
    case 'sp':
      win(userChoice, computerChoice);
      break;
    case 'rp':
    case 'ps':
    case 'sr':
      lose(userChoice, computerChoice);
      break;
    case 'rr':
    case 'pp':
    case 'ss':
      draw(userChoice, computerChoice);
      break;
  }

  // Trigger blockchain play (requires wallet + funds)
  playOnChain(moveMap[userChoice]);
}

// Event listeners
function main() {
  rock_div.addEventListener('click', () => game('r'));
  paper_div.addEventListener('click', () => game('p'));
  scissors_div.addEventListener('click', () => game('s'));

  // Auto-show bet if wallet already connected
  if (window.ethereum) {
    window.ethereum.request({ method: "eth_accounts" }).then(accounts => {
      if (accounts && accounts.length > 0) {
        document.getElementById("connectBtn").innerText = "Connected: " + accounts[0];
        showBetAmount();
        refreshHistory();
      }
    });
  }
}
main();
