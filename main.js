let provider;
let signer;
let account;

let lockedReferralSponsor = null;
let referralLinkInvalid = false;

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
      params: [{
        chainId: C.CHAIN_ID_HEX
      }]
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
}

async function connectWallet() {
  if (!window.ethereum) {
    alert("Please install MetaMask or TP Wallet");
    return;
  }

  try {
    await ensureBSC();

    provider = new ethers.providers.Web3Provider(
      window.ethereum,
      "any"
    );

    await provider.send("eth_requestAccounts", []);

    signer = provider.getSigner();
    account = await signer.getAddress();

    usdt = new ethers.Contract(
      C.USDT,
      C.ERC20_ABI,
      signer
    );

    nc = new ethers.Contract(
      C.NC,
      C.ERC20_ABI,
      signer
    );

    core = new ethers.Contract(
      C.CORE,
      C.CORE_ABI,
      signer
    );

    vault = new ethers.Contract(
      C.VAULT,
      C.VAULT_ABI,
      signer
    );

    binary = new ethers.Contract(
      C.BINARY,
      C.BINARY_ABI,
      signer
    );

    staking = new ethers.Contract(
      C.STAKING_V5,
      C.STAKING_V5_ABI,
      signer
    );

    const walletAddress =
      document.getElementById("walletAddress");

    const connectBtn =
      document.getElementById("connectBtn");

    if (walletAddress) {
      walletAddress.innerText = shortAddr(account);
    }

    if (connectBtn) {
      connectBtn.innerText = "Connected";
    }

    loadRefFromUrl();
    buildReferralLinks();

    await loadAll();
  } catch (err) {
    console.error(err);

    alert(
      "Connect failed: " +
      (err.reason || err.message)
    );
  }
}

function loadRefFromUrl() {
  const url = new URL(window.location.href);

  const ref = url.searchParams.get("ref");
  const side = url.searchParams.get("side");

  const sponsorEl =
    document.getElementById("sponsorInput");

  const sideEl =
    document.getElementById("sideInput");

  const checkEl =
    document.getElementById("referralCheck");

  lockedReferralSponsor = null;
  referralLinkInvalid = false;

  if (sponsorEl) {
    sponsorEl.value = "";
    sponsorEl.readOnly = false;
  }

  if (sideEl) {
    sideEl.disabled = false;
  }

  if (ref) {
    try {
      lockedReferralSponsor =
        ethers.utils.getAddress(ref.toLowerCase());

      if (sponsorEl) {
        sponsorEl.value = lockedReferralSponsor;
        sponsorEl.readOnly = true;
      }
    } catch (err) {
      referralLinkInvalid = true;

      if (sponsorEl) {
        sponsorEl.value = "";
        sponsorEl.readOnly = true;
      }
    }
  }

  if (side === "right" && sideEl) {
    sideEl.value = "true";
  }

  if (side === "left" && sideEl) {
    sideEl.value = "false";
  }

  if (
    lockedReferralSponsor &&
    sideEl &&
    (side === "left" || side === "right")
  ) {
    sideEl.disabled = true;
  }

  if (checkEl) {
    if (referralLinkInvalid) {
      checkEl.className =
        "status-box danger-text";

      checkEl.innerText =
        "Invalid referral link. Purchase is blocked. " +
        "Please request a new link.";
    } else if (lockedReferralSponsor) {
      let teamSide = "Select below";

      if (side === "right") {
        teamSide = "Right";
      }

      if (side === "left") {
        teamSide = "Left";
      }

      checkEl.className =
        "status-box success";

      checkEl.innerText =
        "Verified sponsor: " +
        lockedReferralSponsor +
        " • Team side: " +
        teamSide;
    } else {
      checkEl.className = "status-box";

      checkEl.innerText =
        "No referral link detected. " +
        "Check the sponsor address before buying.";
    }
  }
}

function buildReferralLinks() {
  if (!account) return;

  const base =
    window.location.origin +
    window.location.pathname;

  const main =
    base +
    "?ref=" +
    account;

  const left =
    base +
    "?ref=" +
    account +
    "&side=left";

  const right =
    base +
    "?ref=" +
    account +
    "&side=right";

  const refLink =
    document.getElementById("refLink");

  const leftRefLink =
    document.getElementById("leftRefLink");

  const rightRefLink =
    document.getElementById("rightRefLink");

  if (refLink) {
    refLink.value = main;
  }

  if (leftRefLink) {
    leftRefLink.value = left;
  }

  if (rightRefLink) {
    rightRefLink.value = right;
  }
}

async function copyReferral() {
  const input =
    document.getElementById("refLink");

  if (!input) return;

  await navigator.clipboard.writeText(input.value);

  const status =
    document.getElementById("copyStatus");

  if (status) {
    status.innerText = "Main referral copied";
  }
}

async function copyLeftReferral() {
  const input =
    document.getElementById("leftRefLink");

  if (!input) return;

  await navigator.clipboard.writeText(input.value);

  const status =
    document.getElementById("copyStatus");

  if (status) {
    status.innerText = "Left referral copied";
  }
}

async function copyRightReferral() {
  const input =
    document.getElementById("rightRefLink");

  if (!input) return;

  await navigator.clipboard.writeText(input.value);

  const status =
    document.getElementById("copyStatus");

  if (status) {
    status.innerText = "Right referral copied";
  }
}

async function loadAll() {
  if (!account) return;

  try {
    const usdtBal =
      await usdt.balanceOf(account);

    const ncBal =
      await nc.balanceOf(account);

    const usdtBalance =
      document.getElementById("usdtBalance");

    const ncBalance =
      document.getElementById("ncBalance");

    if (usdtBalance) {
      usdtBalance.innerText =
        fmt(usdtBal) + " USDT";
    }

    if (ncBalance) {
      ncBalance.innerText =
        fmt(ncBal) + " NC";
    }

    const user = await core.users(account);

    const myPackage =
      document.getElementById("myPackage");

    const myRank =
      document.getElementById("myRank");

    const myDirects =
      document.getElementById("myDirects");

    if (myPackage) {
      myPackage.innerText =
        pkgName(user.pkg);
    }

    if (myRank) {
      myRank.innerText =
        rankName(user.rank);
    }

    if (myDirects) {
      myDirects.innerText =
        String(user.directSmallOrMore);
    }

    const sNC = await core.smallNC();
    const mNC = await core.mediumNC();
    const lNC = await core.largeNC();

    const smallNC =
      document.getElementById("smallNC");

    const mediumNC =
      document.getElementById("mediumNC");

    const largeNC =
      document.getElementById("largeNC");

    if (smallNC) {
      smallNC.innerText =
        fmt(sNC) + " NC";
    }

    if (mediumNC) {
      mediumNC.innerText =
        fmt(mNC) + " NC";
    }

    if (largeNC) {
      largeNC.innerText =
        fmt(lNC) + " NC";
    }

    const claimU =
      await vault.claimableUSDT(account);

    const claimN =
      await vault.claimableDF(account);

    const claimUSDT =
      document.getElementById("claimUSDT");

    const claimNC =
      document.getElementById("claimNC");

    if (claimUSDT) {
      claimUSDT.innerText =
        fmt(claimU) + " USDT";
    }

    if (claimNC) {
      claimNC.innerText =
        fmt(claimN) + " NC";
    }

    await loadStakes();
  } catch (err) {
    console.error(err);

    const status =
      document.getElementById("txStatus");

    if (status) {
      status.innerText =
        "Load error: " +
        (err.reason || err.message);
    }
  }
}

async function approveUSDT(pkgId) {
  if (!account) {
    alert("Connect wallet first");
    return;
  }

  try {
    const status =
      document.getElementById("txStatus");

    if (status) {
      status.innerText =
        "Approving USDT...";
    }

    const amount =
      await core.priceUSDT(pkgId);

    const tx =
      await usdt.approve(C.CORE, amount);

    await tx.wait();

    if (status) {
      status.innerText =
        "Approve success";
    }
  } catch (err) {
    console.error(err);

    const status =
      document.getElementById("txStatus");

    if (status) {
      status.innerText =
        "Approve failed: " +
        (err.reason || err.message);
    }
  }
}

async function buyPackage(pkgId) {
  if (!account) {
    alert("Connect wallet first");
    return;
  }

  try {
    const status =
      document.getElementById("txStatus");

    if (status) {
      status.innerText =
        "Verifying sponsor...";
    }

    const url =
      new URL(window.location.href);

    const refFromUrl =
      url.searchParams.get("ref");

    const sideFromUrl =
      url.searchParams.get("side");

    const sponsorInput =
      document.getElementById("sponsorInput");

    const sideInput =
      document.getElementById("sideInput");

    let sponsor = sponsorInput
      ? sponsorInput.value.trim()
      : "";

    let sideRight = sideInput
      ? sideInput.value === "true"
      : false;

    if (referralLinkInvalid) {
      throw new Error(
        "Invalid referral link. " +
        "Please request a new referral link."
      );
    }

    /*
     * ถ้าเข้าผ่านลิงก์แนะนำ
     * ต้องใช้ Sponsor และ Side จาก URL เท่านั้น
     */
    if (refFromUrl) {
      const verifiedSponsor =
        ethers.utils.getAddress(
          refFromUrl.toLowerCase()
        );

      if (
        !lockedReferralSponsor ||
        verifiedSponsor.toLowerCase() !==
          lockedReferralSponsor.toLowerCase() ||
        sponsor.toLowerCase() !==
          verifiedSponsor.toLowerCase()
      ) {
        throw new Error(
          "Sponsor verification failed. " +
          "Purchase cancelled."
        );
      }

      sponsor = verifiedSponsor;

      if (sideFromUrl === "right") {
        sideRight = true;
      }

      if (sideFromUrl === "left") {
        sideRight = false;
      }
    }

    if (
      sponsor &&
      !ethers.utils.isAddress(sponsor)
    ) {
      throw new Error(
        "Invalid sponsor address. " +
        "Purchase cancelled."
      );
    }

    if (!sponsor) {
      sponsor =
        ethers.constants.AddressZero;
    }

    if (
      sponsor !==
      ethers.constants.AddressZero
    ) {
      if (
        sponsor.toLowerCase() ===
        account.toLowerCase()
      ) {
        throw new Error(
          "Your own wallet cannot be the sponsor."
        );
      }

      const sponsorRegistered =
        await core.registered(sponsor);

      if (!sponsorRegistered) {
        throw new Error(
          "Sponsor is not registered. " +
          "Purchase cancelled."
        );
      }
    }

    if (status) {
      status.innerText =
        "Verified sponsor: " +
        sponsor +
        " | Buying package...";
    }

    /*
     * Placement parent ให้ Smart Contract
     * เป็นผู้ค้นหาตำแหน่งว่างตามฝั่งที่เลือก
     */
    const placementParent =
      ethers.constants.AddressZero;

    const tx =
      await core.buyOrUpgrade(
        pkgId,
        sponsor,
        placementParent,
        sideRight
      );

    await tx.wait();

    if (status) {
      status.innerText =
        "Package purchased successfully";
    }

    await loadAll();
  } catch (err) {
    console.error(err);

    const message =
      err.reason ||
      err.data?.message ||
      err.message ||
      "Unknown error";

    const status =
      document.getElementById("txStatus");

    if (status) {
      status.innerText =
        "Buy failed: " + message;
    }

    alert(
      "Purchase cancelled: " + message
    );
  }
}

async function claimVault() {
  if (!account) {
    alert("Connect wallet first");
    return;
  }

  try {
    const status =
      document.getElementById("txStatus");

    if (status) {
      status.innerText =
        "Claiming Vault...";
    }

    const tx =
      await vault.claim();

    await tx.wait();

    if (status) {
      status.innerText =
        "Vault claim success";
    }

    await loadAll();
  } catch (err) {
    console.error(err);

    const status =
      document.getElementById("txStatus");

    if (status) {
      status.innerText =
        "Claim failed: " +
        (err.reason || err.message);
    }
  }
}

function formatCountdown(sec) {
  if (sec <= 0) {
    return "Matured";
  }

  const days =
    Math.floor(sec / 86400);

  sec = sec % 86400;

  const hours =
    Math.floor(sec / 3600);

  sec = sec % 3600;

  const minutes =
    Math.floor(sec / 60);

  return (
    days +
    "d " +
    hours +
    "h " +
    minutes +
    "m"
  );
}

async function loadStakes() {
  if (!account || !staking) return;

  const box =
    document.getElementById("stakeList");

  if (!box) return;

  box.innerHTML = "";

  try {
    const totalReward =
      await staking.pendingRewardTotal(account);

    const pendingRewardTotal =
      document.getElementById(
        "pendingRewardTotal"
      );

    if (pendingRewardTotal) {
      pendingRewardTotal.innerText =
        fmt(totalReward) + " NC";
    }

    const count =
      await staking.stakeCount(account);

    let active =
      ethers.BigNumber.from(0);

    let matured =
      ethers.BigNumber.from(0);

    let nextCountdown = "--";

    if (Number(count) === 0) {
      box.innerHTML =
        '<div class="stake-item small">' +
        "No staking position found." +
        "</div>";
    }

    for (
      let i = 0;
      i < Number(count);
      i++
    ) {
      const stake =
        await staking.stakeAt(account, i);

      const reward =
        await staking.pendingReward(
          account,
          i
        );

      const now =
        Math.floor(Date.now() / 1000);

      const remain =
        Number(stake.end) - now;

      const isMatured =
        remain <= 0;

      if (!stake.claimed) {
        active =
          active.add(stake.principal);

        if (isMatured) {
          matured =
            matured.add(stake.principal);
        }

        if (
          nextCountdown === "--" &&
          !isMatured
        ) {
          nextCountdown =
            formatCountdown(remain);
        }
      }

      const div =
        document.createElement("div");

      div.className = "stake-item";

      let stakeStatus = "Active";

      if (stake.claimed) {
        stakeStatus = "Claimed";
      } else if (isMatured) {
        stakeStatus = "Matured";
      }

      const countdownText =
        stake.claimed
          ? "-"
          : formatCountdown(remain);

      div.innerHTML = `
        <b>Stake #${i}</b><br><br>

        Package:
        ${pkgName(Number(stake.pkg) + 1)}
        <br>

        Principal:
        ${fmt(stake.principal)} NC
        <br>

        Pending Reward:
        ${fmt(reward)} NC
        <br>

        Status:
        ${stakeStatus}
        <br>

        Countdown:
        ${countdownText}
        <br><br>

        <button
          ${
            stake.claimed || !isMatured
              ? "disabled"
              : ""
          }
          onclick="claimStake(${i})"
        >
          Claim Stake
        </button>
      `;

      box.appendChild(div);
    }

    const activeStake =
      document.getElementById(
        "activeStake"
      );

    const maturedStake =
      document.getElementById(
        "maturedStake"
      );

    const nextCountdownEl =
      document.getElementById(
        "nextCountdown"
      );

    if (activeStake) {
      activeStake.innerText =
        fmt(active) + " NC";
    }

    if (maturedStake) {
      maturedStake.innerText =
        fmt(matured) + " NC";
    }

    if (nextCountdownEl) {
      nextCountdownEl.innerText =
        nextCountdown;
    }
  } catch (err) {
    console.error(err);

    box.innerHTML =
      '<div class="stake-item danger-text">' +
      "Stake load error" +
      "</div>";
  }
}

async function claimStake(id) {
  if (!account) {
    alert("Connect wallet first");
    return;
  }

  try {
    const status =
      document.getElementById("txStatus");

    if (status) {
      status.innerText =
        "Claiming stake...";
    }

    const tx =
      await staking.claimStake(id);

    await tx.wait();

    if (status) {
      status.innerText =
        "Stake claim success";
    }

    await loadAll();
  } catch (err) {
    console.error(err);

    const status =
      document.getElementById("txStatus");

    if (status) {
      status.innerText =
        "Stake claim failed: " +
        (err.reason || err.message);
    }
  }
}

async function claimAllMatured() {
  if (!account) {
    alert("Connect wallet first");
    return;
  }

  try {
    const status =
      document.getElementById("txStatus");

    if (status) {
      status.innerText =
        "Claiming all matured stakes...";
    }

    const tx =
      await staking.claimAllMatured(50);

    await tx.wait();

    if (status) {
      status.innerText =
        "Claim all success";
    }

    await loadAll();
  } catch (err) {
    console.error(err);

    const status =
      document.getElementById("txStatus");

    if (status) {
      status.innerText =
        "Claim all failed: " +
        (err.reason || err.message);
    }
  }
}

if (window.ethereum) {
  window.ethereum.on(
    "accountsChanged",
    function () {
      window.location.reload();
    }
  );

  window.ethereum.on(
    "chainChanged",
    function () {
      window.location.reload();
    }
  );
}

window.addEventListener(
  "DOMContentLoaded",
  function () {
    loadRefFromUrl();
  }
);

setInterval(function () {
  if (account) {
    loadStakes();
  }
}, 60000);
