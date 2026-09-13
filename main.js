let provider;
let signer;
let account;

let usdt;
let nc;
let core;
let vault;
let binary;
let staking;

const C = window.APP_CONFIG;

function fmt(v, d = 18) {
  try {
    return Number(
      ethers.utils.formatUnits(v, d)
    ).toLocaleString(undefined, {
      maximumFractionDigits: 4
    });
  } catch {
    return "0";
  }
}

function shortAddr(a) {
  if (!a) return "-";
  return a.slice(0, 6) + "..." + a.slice(-4);
}

function pkgName(id) {
  if (Number(id) === 1) return "Small";
  if (Number(id) === 2) return "Medium";
  if (Number(id) === 3) return "Large";
  return "None";
}

function rankName(id) {
  if (Number(id) === 1) return "Bronze";
  if (Number(id) === 2) return "Silver";
  if (Number(id) === 3) return "Gold";
  return "None";
}

async function ensureBSC() {
  const chainId = await window.ethereum.request({
    method: "eth_chainId"
  });

  if (chainId === C.CHAIN_ID_HEX) return;

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: C.CHAIN_ID_HEX }]
    });
  } catch (err) {
    if (err.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: C.CHAIN_ID_HEX,
          chainName: C.CHAIN_NAME,
          nativeCurrency: {
            name: "BNB",
            symbol: "BNB",
            decimals: 18
          },
          rpcUrls: [C.RPC_URL],
          blockExplorerUrls: [C.BLOCK_EXPLORER]
        }]
      });
    } else {
      throw err;
    }
  }
}async function connectWallet() {
  if (!window.ethereum) {
    alert("Please install MetaMask or Bitget Wallet");
    return;
  }

  try {
    await ensureBSC();

    provider = new ethers.providers.Web3Provider(window.ethereum, "any");

    await provider.send("eth_requestAccounts", []);

    signer = provider.getSigner();
    account = await signer.getAddress();

    usdt = new ethers.Contract(C.USDT, C.ERC20_ABI, signer);
    nc = new ethers.Contract(C.NC, C.ERC20_ABI, signer);
    core = new ethers.Contract(C.CORE, C.CORE_ABI, signer);
    vault = new ethers.Contract(C.VAULT, C.VAULT_ABI, signer);
    binary = new ethers.Contract(C.BINARY, C.BINARY_ABI, signer);
    staking = new ethers.Contract(C.STAKING_V5, C.STAKING_V5_ABI, signer);

    document.getElementById("walletAddress").innerText = shortAddr(account);
    document.getElementById("connectBtn").innerText = "Connected";

    loadRefFromUrl();
    buildReferralLinks();

    await loadAll();

  } catch (err) {
    console.error(err);
    alert("Connect failed: " + (err.reason || err.message));
  }
}

function loadRefFromUrl() {
  const url = new URL(window.location.href);

  const ref = url.searchParams.get("ref");
  const side = url.searchParams.get("side");

  if (ref && ethers.utils.isAddress(ref)) {
    const el = document.getElementById("sponsorInput");
    if (el) el.value = ref;
  }

  if (side === "right") {
    const el = document.getElementById("sideInput");
    if (el) el.value = "true";
  }

  if (side === "left") {
    const el = document.getElementById("sideInput");
    if (el) el.value = "false";
  }
}

function buildReferralLinks() {
  if (!account) return;

  const base = window.location.origin + window.location.pathname;

  const main = base + "?ref=" + account;
  const left = base + "?ref=" + account + "&side=left";
  const right = base + "?ref=" + account + "&side=right";

  if (document.getElementById("refLink")) {
    document.getElementById("refLink").value = main;
  }

  if (document.getElementById("leftRefLink")) {
    document.getElementById("leftRefLink").value = left;
  }

  if (document.getElementById("rightRefLink")) {
    document.getElementById("rightRefLink").value = right;
  }
}

async function copyReferral() {
  await navigator.clipboard.writeText(
    document.getElementById("refLink").value
  );
  document.getElementById("copyStatus").innerText = "Main referral copied";
}

async function copyLeftReferral() {
  await navigator.clipboard.writeText(
    document.getElementById("leftRefLink").value
  );
  document.getElementById("copyStatus").innerText = "Left referral copied";
}

async function copyRightReferral() {
  await navigator.clipboard.writeText(
    document.getElementById("rightRefLink").value
  );
  document.getElementById("copyStatus").innerText = "Right referral copied";
}async function loadAll() {
  if (!account) return;

  try {
    const usdtBal = await usdt.balanceOf(account);
    const ncBal = await nc.balanceOf(account);

    document.getElementById("usdtBalance").innerText = fmt(usdtBal) + " USDT";
    document.getElementById("ncBalance").innerText = fmt(ncBal) + " NC";

    const user = await core.users(account);

    document.getElementById("myPackage").innerText = pkgName(user.pkg);
    document.getElementById("myRank").innerText = rankName(user.rank);
    document.getElementById("myDirects").innerText = String(user.directSmallOrMore);

    const sNC = await core.smallNC();
    const mNC = await core.mediumNC();
    const lNC = await core.largeNC();

    document.getElementById("smallNC").innerText = fmt(sNC) + " NC";
    document.getElementById("mediumNC").innerText = fmt(mNC) + " NC";
    document.getElementById("largeNC").innerText = fmt(lNC) + " NC";

    const claimU = await vault.claimableUSDT(account);
    const claimN = await vault.claimableDF(account);

    document.getElementById("claimUSDT").innerText = fmt(claimU) + " USDT";
    document.getElementById("claimNC").innerText = fmt(claimN) + " NC";

    const vol = await binary.volumesOf(account);

    

    await loadStakes();

  } catch (err) {
    console.error(err);

    const st = document.getElementById("txStatus");
    if (st) {
      st.innerText = "Load error: " + (err.reason || err.message);
    }
  }
}

async function approveUSDT(pkgId) {
  if (!account) {
    alert("Connect wallet first");
    return;
  }

  try {
    const st = document.getElementById("txStatus");
    if (st) st.innerText = "Approving USDT...";

    const amount = await core.priceUSDT(pkgId);

    const tx = await usdt.approve(C.CORE, amount);
    await tx.wait();

    if (st) st.innerText = "Approve success";
  } catch (err) {
    console.error(err);
    const st = document.getElementById("txStatus");
    if (st) st.innerText = "Approve failed: " + (err.reason || err.message);
  }
}

async function buyPackage(pkgId) {
  if (!account) {
    alert("Connect wallet first");
    return;
  }

  try {
    const st = document.getElementById("txStatus");
    if (st) st.innerText = "Buying package...";

    let sponsor = document.getElementById("sponsorInput").value.trim();
    const sideRight = document.getElementById("sideInput").value === "true";

    if (!sponsor || !ethers.utils.isAddress(sponsor)) {
      sponsor = ethers.constants.AddressZero;
    }

    const placementParent = ethers.constants.AddressZero;

    const tx = await core.buyOrUpgrade(
      pkgId,
      sponsor,
      placementParent,
      sideRight
    );

    await tx.wait();

    if (st) st.innerText = "Package purchased successfully";

    await loadAll();

  } catch (err) {
    console.error(err);
    const st = document.getElementById("txStatus");
    if (st) st.innerText = "Buy failed: " + (err.reason || err.message);
  }
}

async function claimVault() {
  if (!account) {
    alert("Connect wallet first");
    return;
  }

  try {
    const st = document.getElementById("txStatus");
    if (st) st.innerText = "Claiming Vault...";

    const tx = await vault.claim();
    await tx.wait();

    if (st) st.innerText = "Vault claim success";

    await loadAll();

  } catch (err) {
    console.error(err);
    const st = document.getElementById("txStatus");
    if (st) st.innerText = "Claim failed: " + (err.reason || err.message);
  }
}function formatCountdown(sec) {
  if (sec <= 0) return "Matured";

  const d = Math.floor(sec / 86400);
  sec = sec % 86400;

  const h = Math.floor(sec / 3600);
  sec = sec % 3600;

  const m = Math.floor(sec / 60);

  return d + "d " + h + "h " + m + "m";
}

async function loadStakes() {
  if (!account || !staking) return;

  const box = document.getElementById("stakeList");
  if (!box) return;

  box.innerHTML = "";

  try {
    const totalReward = await staking.pendingRewardTotal(account);
    document.getElementById("pendingRewardTotal").innerText =
      fmt(totalReward) + " NC";

    const count = await staking.stakeCount(account);

    let active = ethers.BigNumber.from(0);
    let matured = ethers.BigNumber.from(0);
    let nextCountdown = "--";

    if (Number(count) === 0) {
      box.innerHTML =
        `<div class="stake-item small">No staking position found.</div>`;
    }

    for (let i = 0; i < Number(count); i++) {
      const s = await staking.stakeAt(account, i);
      const reward = await staking.pendingReward(account, i);

      const now = Math.floor(Date.now() / 1000);
      const remain = Number(s.end) - now;
      const isMatured = remain <= 0;

      if (!s.claimed) {
        active = active.add(s.principal);

        if (isMatured) {
          matured = matured.add(s.principal);
        }

        if (nextCountdown === "--" && !isMatured) {
          nextCountdown = formatCountdown(remain);
        }
      }

      const div = document.createElement("div");
      div.className = "stake-item";

      div.innerHTML = `
        <b>Stake #${i}</b><br/><br/>
        Package: ${pkgName(Number(s.pkg) + 1)}<br/>
        Principal: ${fmt(s.principal)} NC<br/>
        Pending Reward: ${fmt(reward)} NC<br/>
        Status: ${
          s.claimed
            ? "Claimed"
            : isMatured
              ? "Matured"
              : "Active"
        }<br/>
        Countdown: ${
          s.claimed ? "-" : formatCountdown(remain)
        }<br/><br/>

        <button ${
          s.claimed || !isMatured ? "disabled" : ""
        } onclick="claimStake(${i})">
          Claim Stake
        </button>
      `;

      box.appendChild(div);
    }

    document.getElementById("activeStake").innerText =
      fmt(active) + " NC";

    document.getElementById("maturedStake").innerText =
      fmt(matured) + " NC";

    document.getElementById("nextCountdown").innerText =
      nextCountdown;

  } catch (err) {
    console.error(err);
    box.innerHTML =
      `<div class="stake-item danger-text">Stake load error</div>`;
  }
}

async function claimStake(id) {
  if (!account) {
    alert("Connect wallet first");
    return;
  }

  try {
    const st = document.getElementById("txStatus");
    if (st) st.innerText = "Claiming stake...";

    const tx = await staking.claimStake(id);
    await tx.wait();

    if (st) st.innerText = "Stake claim success";

    await loadAll();

  } catch (err) {
    console.error(err);
    const st = document.getElementById("txStatus");
    if (st) {
      st.innerText =
        "Stake claim failed: " + (err.reason || err.message);
    }
  }
}

async function claimAllMatured() {
  if (!account) {
    alert("Connect wallet first");
    return;
  }

  try {
    const st = document.getElementById("txStatus");
    if (st) st.innerText = "Claiming all matured stakes...";

    const tx = await staking.claimAllMatured(50);
    await tx.wait();

    if (st) st.innerText = "Claim all success";

    await loadAll();

  } catch (err) {
    console.error(err);
    const st = document.getElementById("txStatus");
    if (st) {
      st.innerText =
        "Claim all failed: " + (err.reason || err.message);
    }
  }
}

if (window.ethereum) {
  window.ethereum.on("accountsChanged", () => window.location.reload());
  window.ethereum.on("chainChanged", () => window.location.reload());
}

setInterval(() => {
  if (account) {
    loadStakes();
  }
}, 60000);
