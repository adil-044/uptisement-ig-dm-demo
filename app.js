(() => {
  const CAL = "https://calendly.com/uptisement/30min";
  const thread = document.getElementById("thread");
  const quick = document.getElementById("quick");
  const form = document.getElementById("form");
  const input = document.getElementById("input");
  const resetBtn = document.getElementById("resetBtn");

  /** @type {{step: string, intent: string, busy: boolean}} */
  let state = { step: "boot", intent: "", busy: false };

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

  function isVague(text) {
    return /^(nothing|n\/?a|idk|i don'?t know|dunno|none|no idea|skip|\.|-|—|nada|whatever|not sure|unsure|hi|hey|hello)$/i.test(
      text.trim()
    );
  }

  async function botSay(text, { link, linkLabel } = {}) {
    const typing = el("div", "typing", "<i></i><i></i><i></i>");
    thread.appendChild(typing);
    scrollBottom();
    await sleep(400 + Math.min(700, text.length * 9));
    typing.remove();
    const bubble = el("div", "msg msg--bot" + (link ? " msg--link" : ""), "");
    bubble.appendChild(document.createTextNode(text));
    if (link) {
      const a = el("a", "btn-cal", linkLabel || "Book a call");
      a.href = CAL;
      a.target = "_blank";
      a.rel = "noopener";
      bubble.appendChild(a);
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

  function intentChips() {
    setChips([
      { label: "Website / web makeover", value: "website" },
      { label: "Faster quotes / estimator", value: "estimator" },
      { label: "AI automation", value: "automation" },
      { label: "Just book a call", value: "book" },
      { label: "Talk to Adil", value: "adil" },
    ]);
  }

  function detectIntent(text) {
    const t = text.toLowerCase();
    if (/adil|human|real person|talk to/.test(t)) return "adil";
    if (/book|call|calendly|meeting|schedule|chat/.test(t)) return "book";
    if (/site|website|web|seo|redesign|makeover|landing/.test(t)) return "website";
    if (/quote|estimat|roof|ballpark|photo.?to/.test(t)) return "estimator";
    if (/automat|ai |busywork|follow.?up|dm bot|instagram dm|chatbot/.test(t)) return "automation";
    if (/price|cost|how much/.test(t)) return "pricing";
    return null;
  }

  async function start() {
    state = { step: "intent", intent: "", busy: false };
    thread.innerHTML = "";
    setChips([]);
    await botSay("Hey — thanks for messaging Uptisement.");
    await botSay("What do you need help with?");
    intentChips();
    input.focus();
  }

  async function sendBook(preLines) {
    state.step = "booked_wait";
    for (const line of preLines) await botSay(line);
    await botSay("Pick a time that works — reply BOOKED when it’s on the calendar.", {
      link: true,
      linkLabel: "Book 30 min with Adil",
    });
    setChips([
      { label: "BOOKED ✓", value: "BOOKED" },
      { label: "I have a question first", value: "question" },
    ]);
  }

  async function pathWebsite() {
    state.intent = "website";
    state.step = "web_q";
    await botSay("Website — got it.");
    await botSay("Do you already have a site, or starting fresh / mostly on Instagram?");
    setChips([
      { label: "I have a site", value: "have_site" },
      { label: "Mostly Instagram", value: "ig_only" },
      { label: "No site yet", value: "no_site" },
      { label: "Just book a call", value: "book" },
    ]);
  }

  async function pathEstimator() {
    state.intent = "estimator";
    state.step = "est_q";
    await botSay("Faster quotes — that’s our photo-to-ballpark setup.");
    await botSay("Are leads going cold while you wait on a written number?");
    setChips([
      { label: "Yes, leads go cold", value: "cold" },
      { label: "Sometimes", value: "sometimes" },
      { label: "Just want to see it", value: "see_it" },
      { label: "Just book a call", value: "book" },
    ]);
  }

  async function pathAutomation() {
    state.intent = "automation";
    state.step = "auto_q";
    await botSay("AI automation — cool.");
    await botSay("What should it take off your plate — IG DMs, follow-ups, reviews, or something else?");
    setChips([
      { label: "IG / inbox DMs", value: "ig_dms" },
      { label: "Follow-ups", value: "followups" },
      { label: "Reviews", value: "reviews" },
      { label: "Something else", value: "other_auto" },
      { label: "Just book a call", value: "book" },
    ]);
  }

  async function pathAdil() {
    state.intent = "adil";
    state.step = "booked_wait";
    await botSay("You got it — Adil will jump into this chat.");
    await botSay("If you’d rather lock a time now:", {
      link: true,
      linkLabel: "Book with Adil",
    });
    setChips([
      { label: "BOOKED ✓", value: "BOOKED" },
      { label: "I’ll wait here", value: "wait" },
    ]);
  }

  async function routeIntent(intent, rawText) {
    if (intent === "adil") return pathAdil();
    if (intent === "book") {
      return sendBook(["Easy — let’s get you on Adil’s calendar."]);
    }
    if (intent === "website") return pathWebsite();
    if (intent === "estimator") return pathEstimator();
    if (intent === "automation") return pathAutomation();
    if (intent === "pricing") {
      state.step = "pricing";
      await botSay("Pricing depends on the lane — sites start ~$300 CAD; estimator is $500 setup + $50/estimate or 5–10% of closed jobs.");
      await botSay("Which are you asking about?");
      intentChips();
      state.step = "intent";
      return;
    }
    // free text unclear
    if (isVague(rawText) || !intent) {
      await botSay("No worries — pick whatever’s closest, or say it in your own words.");
      intentChips();
      state.step = "intent";
      return;
    }
  }

  async function handleUser(raw, display) {
    const text = (raw || "").trim();
    if (!text || state.busy) return;
    state.busy = true;
    setChips([]);
    addUser(display || text);

    try {
      const lower = text.toLowerCase();

      if (/^(stop|unsubscribe|not interested|remove me)$/i.test(text.trim())) {
        state.step = "done";
        await botSay("All good — you’re off the list. Won’t message again.");
        return;
      }

      if (state.step === "booked_wait") {
        if (/booked/i.test(lower)) {
          state.step = "done";
          await botSay("Perfect — you’re booked. Talk soon.");
          return;
        }
        if (/wait/i.test(lower)) {
          state.step = "done";
          await botSay("Sounds good — Adil will reply here.");
          return;
        }
        if (/question/i.test(lower)) {
          state.step = "intent";
          await botSay("Ask away — or tap what you need help with.");
          intentChips();
          return;
        }
        await botSay("When you’ve got a slot, reply BOOKED — or ask anything first.");
        setChips([
          { label: "BOOKED ✓", value: "BOOKED" },
          { label: "I have a question first", value: "question" },
        ]);
        return;
      }

      if (state.step === "intent") {
        // chip values are intent keys; free text needs detect
        const fromChip = ["website", "estimator", "automation", "book", "adil", "pricing"].includes(text);
        const intent = fromChip ? text : detectIntent(text);
        await routeIntent(intent, text);
        return;
      }

      if (state.step === "web_q") {
        if (text === "book" || /just book|book a call/i.test(lower)) {
          return sendBook(["Let’s lock a time and scope the site on the call."]);
        }
        let ack = "Got it.";
        if (/have_site|have a site/i.test(lower)) ack = "Cool — bring the URL to the call (or paste it here). We’ll see what’s costing you bookings.";
        else if (/ig|instagram/i.test(lower)) ack = "IG-only is common. A clean site usually pays for itself in a few bookings.";
        else if (/no_site|no site/i.test(lower)) ack = "Starting fresh is fine — we keep pages tight.";
        await botSay(ack);
        await botSay("Done-for-you web makeover — mobile, clear services, book/contact, basic SEO. Starter around $300 CAD.");
        return sendBook(["Want Adil to walk you through it?"]);
      }

      if (state.step === "est_q") {
        if (text === "book" || /just book|book a call/i.test(lower)) {
          return sendBook(["Let’s put 30 min on the calendar."]);
        }
        let ack = "Got it.";
        if (/cold/i.test(lower)) ack = "Yeah — first written price usually wins.";
        else if (/sometimes/i.test(lower)) ack = "Even ‘sometimes’ adds up over a season.";
        else if (/see/i.test(lower)) ack = "Perfect — call is the fastest demo.";
        await botSay(ack);
        await botSay("Setup: photos → same-day written ballpark. $500 + $50/estimate, or 5–10% of jobs closed. 30-day refund if the bottleneck stays.");
        return sendBook(["Grab 30 min and we’ll see if it fits:"]);
      }

      if (state.step === "auto_q") {
        if (text === "book" || /just book|book a call/i.test(lower)) {
          return sendBook(["Easy — calendar next."]);
        }
        const label =
          /ig|dm|inbox/i.test(lower)
            ? "IG DMs"
            : /follow/i.test(lower)
              ? "follow-ups"
              : /review/i.test(lower)
                ? "reviews"
                : "that";
        await botSay(`Got it — ${label}.`);
        await botSay("We’ll map a done-for-you flow on the call so scope (and price) stay honest.");
        return sendBook(["Book 30 min with Adil:"]);
      }

      if (state.step === "done") {
        if (/^(hi|hey|hello)\b/i.test(text)) return start();
        await botSay("Thread’s wrapped — hit Reset to try again, or book here:", {
          link: true,
          linkLabel: "Calendly",
        });
        return;
      }

      // fallback → treat as intent
      state.step = "intent";
      await routeIntent(detectIntent(text), text);
    } finally {
      state.busy = false;
    }
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const v = input.value;
    input.value = "";
    handleUser(v);
  });

  resetBtn.addEventListener("click", () => {
    if (state.busy) return;
    start();
  });

  start();
})();
