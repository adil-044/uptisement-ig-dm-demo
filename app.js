(() => {
  const CAL = "https://calendly.com/uptisement/30min";
  const thread = document.getElementById("thread");
  const quick = document.getElementById("quick");
  const form = document.getElementById("form");
  const input = document.getElementById("input");
  const resetBtn = document.getElementById("resetBtn");

  /** @type {{step: string, lane: string, biz: string}} */
  let state = { step: "boot", lane: "", biz: "" };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function el(tag, cls, html) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  function scrollBottom() {
    thread.scrollTop = thread.scrollHeight;
  }

  function addUser(text) {
    thread.appendChild(el("div", "msg msg--user", escapeHtml(text)));
    scrollBottom();
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  async function botSay(text, { link } = {}) {
    const typing = el("div", "typing", "<i></i><i></i><i></i>");
    thread.appendChild(typing);
    scrollBottom();
    await sleep(550 + Math.min(900, text.length * 12));
    typing.remove();
    const bubble = el("div", "msg msg--bot" + (link ? " msg--link" : ""), "");
    bubble.appendChild(document.createTextNode(text));
    if (link) {
      const a = el("a", "btn-cal", "Book 30 min →");
      a.href = CAL;
      a.target = "_blank";
      a.rel = "noopener";
      bubble.appendChild(a);
      const hint = el("span", "", "");
      hint.style.fontSize = "0.78rem";
      hint.style.opacity = "0.85";
      hint.textContent = "Reply BOOKED when it’s on the calendar.";
      bubble.appendChild(hint);
    }
    thread.appendChild(bubble);
    scrollBottom();
  }

  function setChips(options) {
    quick.innerHTML = "";
    if (!options || !options.length) {
      quick.hidden = true;
      return;
    }
    quick.hidden = false;
    options.forEach((opt) => {
      const b = el("button", "chip", opt.label);
      b.type = "button";
      b.addEventListener("click", () => handleUser(opt.value, opt.label));
      quick.appendChild(b);
    });
  }

  function detectLane(text) {
    const t = text.toLowerCase();
    if (/quote|estimat|roof|ballpark|photo|storm|shingle/.test(t)) return "estimator";
    if (/site|website|web|seo|booking page|instagram only|no site/.test(t)) return "web";
    if (/automat|busywork|follow.?up|review|prospect|crm|manual/.test(t)) return "automation";
    if (/slow quote|cold lead/.test(t)) return "estimator";
    if (/slow site|outdated/.test(t)) return "web";
    return null;
  }

  async function start() {
    state = { step: "biz", lane: "", biz: "" };
    thread.innerHTML = "";
    setChips([]);
    await botSay("Hey — Adil's team at Uptisement. What kind of business are you running?");
    setChips([
      { label: "Roofing / trades", value: "Roofing / trades" },
      { label: "Salon / local shop", value: "Salon / local shop" },
      { label: "Other SMB", value: "Other SMB" },
    ]);
    input.focus();
  }

  async function afterBiz(text) {
    state.biz = text;
    state.step = "leak";
    await botSay("Biggest leak right now — slow quotes, slow site, or too much manual busywork?");
    setChips([
      { label: "Slow quotes", value: "Slow quotes" },
      { label: "Slow site", value: "Slow site" },
      { label: "Manual busywork", value: "Manual busywork" },
      { label: "Something else", value: "Something else" },
      { label: "Talk to Adil", value: "Talk to Adil" },
    ]);
  }

  async function enterLane(lane) {
    state.lane = lane;
    if (lane === "estimator") {
      state.step = "est_q";
      await botSay("Got it — quotes going cold. When photos come in, how long until a written number goes out?");
      setChips([
        { label: "Same day", value: "Same day" },
        { label: "2–3 days", value: "2–3 days" },
        { label: "A week+", value: "A week+" },
        { label: "Not sure", value: "Not sure" },
      ]);
      return;
    }
    if (lane === "web") {
      state.step = "web_q";
      await botSay("Site leak — do you have a URL, or mostly running on Instagram / no site?");
      setChips([
        { label: "Have URL", value: "Have URL" },
        { label: "IG only", value: "IG only" },
        { label: "No site", value: "No site" },
      ]);
      return;
    }
    if (lane === "automation") {
      state.step = "auto_q";
      await botSay("What eats the most hours every week — follow-ups, reviews, prospecting, or something else?");
      setChips([
        { label: "Follow-ups", value: "Follow-ups" },
        { label: "Reviews", value: "Reviews" },
        { label: "Prospecting", value: "Prospecting" },
        { label: "Other", value: "Other" },
      ]);
      return;
    }
    state.step = "other";
    await botSay("One line — what’s broken or what do you want fixed?");
    setChips([]);
  }

  async function sendCalendly(pre) {
    state.step = "booked_wait";
    setChips([{ label: "BOOKED", value: "BOOKED" }]);
    await botSay(pre, { link: true });
  }

  async function handleUser(raw, display) {
    const text = (raw || "").trim();
    if (!text) return;
    setChips([]);
    addUser(display || text);

    const lower = text.toLowerCase();
    if (/^(stop|unsubscribe|not interested)$/i.test(text.trim())) {
      state.step = "done";
      await botSay("Understood — removing you. Sorry for the ping.");
      return;
    }
    if (/talk to adil|human|real person|adil please/i.test(lower)) {
      state.step = "done";
      await botSay("Looping Adil now — he’ll jump in. Or lock a slot so it’s on the calendar.");
      await sendCalendly("Grab 30 min here:");
      return;
    }
    if (state.step === "booked_wait" && /booked/i.test(lower)) {
      state.step = "done";
      await botSay("Solid — see you on the calendar. If anything shifts, reply here.");
      setChips([]);
      return;
    }

    if (state.step === "biz") {
      await afterBiz(text);
      return;
    }

    if (state.step === "leak") {
      let lane = null;
      if (/quote/i.test(lower)) lane = "estimator";
      else if (/site|web/i.test(lower)) lane = "web";
      else if (/busy|manual|automat/i.test(lower)) lane = "automation";
      else if (/something else|other/i.test(lower)) lane = "other";
      else lane = detectLane(text) || "other";
      await enterLane(lane);
      return;
    }

    if (state.step === "est_q") {
      await botSay(
        "We set up photo → same-day written ballpark so the lead doesn’t go cold. $500 setup + $50/estimate or 5–10% of closed jobs. 30-day refund if the bottleneck stays."
      );
      await sendCalendly("Got it. Grab 30 min here and we'll map the fix —");
      return;
    }

    if (state.step === "web_q") {
      await botSay(
        "We rebuild small-business sites done-for-you — mobile, clear services, book/contact, basic SEO. Starter around $300 CAD for agreed pages."
      );
      await sendCalendly("Got it. Grab 30 min here and we'll map the fix —");
      return;
    }

    if (state.step === "auto_q") {
      await botSay("We wire done-for-you automation around that bottleneck. Pricing depends on scope — fastest path is 30 min with Adil.");
      await sendCalendly("Got it. Grab 30 min here and we'll map the fix —");
      return;
    }

    if (state.step === "other") {
      const guessed = detectLane(text);
      if (guessed) {
        await enterLane(guessed);
        return;
      }
      await sendCalendly("Easiest next step is 30 min so Adil can route it.");
      return;
    }

    if (state.step === "done") {
      await botSay("Thread’s wrapped — reset the demo or book here: " + CAL);
      return;
    }

    // Free-text restart cues
    if (/^(hi|hey|hello)\b/i.test(text)) {
      await start();
      return;
    }

    await botSay("Biggest leak right now — slow quotes, slow site, or too much manual busywork?");
    state.step = "leak";
    setChips([
      { label: "Slow quotes", value: "Slow quotes" },
      { label: "Slow site", value: "Slow site" },
      { label: "Manual busywork", value: "Manual busywork" },
    ]);
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const v = input.value;
    input.value = "";
    handleUser(v);
  });

  resetBtn.addEventListener("click", () => start());

  start();
})();
