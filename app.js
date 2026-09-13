(() => {
  const CAL = "https://calendly.com/uptisement/30min";
  const thread = document.getElementById("thread");
  const quick = document.getElementById("quick");
  const form = document.getElementById("form");
  const input = document.getElementById("input");
  const resetBtn = document.getElementById("resetBtn");

  /** @type {{step: string, lane: string, biz: string, busy: boolean}} */
  let state = { step: "boot", lane: "", biz: "", busy: false };

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
    return /^(nothing|n\/?a|idk|i don'?t know|dunno|none|no idea|skip|\.|-|—|n\/a|nada|whatever|not sure|unsure)$/i.test(
      text.trim()
    );
  }

  async function botSay(text, { link, linkLabel } = {}) {
    const typing = el("div", "typing", "<i></i><i></i><i></i>");
    thread.appendChild(typing);
    scrollBottom();
    await sleep(420 + Math.min(750, text.length * 10));
    typing.remove();
    const bubble = el("div", "msg msg--bot" + (link ? " msg--link" : ""), "");
    bubble.appendChild(document.createTextNode(text));
    if (link) {
      const a = el("a", "btn-cal", linkLabel || "Book 30 min");
      a.href = CAL;
      a.target = "_blank";
      a.rel = "noopener";
      bubble.appendChild(a);
    }
    thread.appendChild(bubble);
    scrollBottom();
  }

  async function botSayMany(lines) {
    for (const line of lines) {
      if (typeof line === "string") await botSay(line);
      else await botSay(line.text, line);
    }
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

  function leakChips() {
    setChips([
      { label: "Slow quotes", value: "Slow quotes" },
      { label: "Site not converting", value: "Slow site" },
      { label: "Too much busywork", value: "Manual busywork" },
      { label: "Something else", value: "Something else" },
      { label: "Just talk to Adil", value: "Talk to Adil" },
    ]);
  }

  function detectLane(text) {
    const t = text.toLowerCase();
    if (/quote|estimat|roof|ballpark|photo|storm|shingle|cold lead/.test(t)) return "estimator";
    if (/site|website|web|seo|booking|instagram only|no site|convert/.test(t)) return "web";
    if (/automat|busywork|follow.?up|review|prospect|crm|manual|hours/.test(t)) return "automation";
    return null;
  }

  function bizFlavor(biz) {
    const t = (biz || "").toLowerCase();
    if (/roof|trade|hvac|contractor|construct/.test(t)) return "trades";
    if (/salon|nail|beaut|barber|spa|shop|retail/.test(t)) return "local";
    if (/smb|business|other|company/.test(t)) return "smb";
    return "generic";
  }

  async function start() {
    state = { step: "biz", lane: "", biz: "", busy: false };
    thread.innerHTML = "";
    setChips([]);
    await botSay("Hey — Adil's team at Uptisement.");
    await botSay("What do you run? Roofing, a shop, salon, something else?");
    setChips([
      { label: "Roofing / trades", value: "Roofing / trades" },
      { label: "Salon / local shop", value: "Salon / local shop" },
      { label: "Other business", value: "Other business" },
      { label: "Not sure yet", value: "Not sure yet" },
    ]);
    input.focus();
  }

  async function afterBiz(text) {
    state.biz = text;
    state.step = "leak";

    if (isVague(text) || /not sure yet/i.test(text)) {
      await botSay("No stress — we work with roofers, shops, salons, all kinds.");
      await botSay(
        "Where are you losing money right now — slow quotes, a site that doesn’t convert, or busywork eating the week?"
      );
    } else {
      const flavor = bizFlavor(text);
      if (flavor === "trades") {
        await botSay(`Roofing / trades — got it.`);
        await botSay(
          "Usually the leak is quotes sitting too long. That you, or is it more the website / office busywork?"
        );
      } else if (flavor === "local") {
        await botSay(`Nice — local shop side.`);
        await botSay(
          "Where are you losing money right now — slow quotes, a site that doesn’t convert, or busywork eating the week?"
        );
      } else {
        await botSay(`Got it — ${text.length > 40 ? "your business" : text}.`);
        await botSay(
          "Where are you losing money right now — slow quotes, a site that doesn’t convert, or busywork eating the week?"
        );
      }
    }
    leakChips();
  }

  async function enterLane(lane) {
    state.lane = lane;
    if (lane === "estimator") {
      state.step = "est_q";
      await botSay("Yeah — cold quotes kill jobs.");
      await botSay("When photos land, how long until a written number goes out?");
      setChips([
        { label: "Same day", value: "Same day" },
        { label: "2–3 days", value: "2–3 days" },
        { label: "A week+", value: "A week+" },
        { label: "Honestly not sure", value: "Not sure" },
      ]);
      return;
    }
    if (lane === "web") {
      state.step = "web_q";
      await botSay("Site / booking leak — common.");
      await botSay("Do you have a URL, or are you mostly on Instagram with no real site?");
      setChips([
        { label: "I have a URL", value: "Have URL" },
        { label: "Mostly Instagram", value: "IG only" },
        { label: "No site yet", value: "No site" },
      ]);
      return;
    }
    if (lane === "automation") {
      state.step = "auto_q";
      await botSay("Busywork tax — yeah.");
      await botSay("What eats the most hours: follow-ups, reviews, prospecting, or something else?");
      setChips([
        { label: "Follow-ups", value: "Follow-ups" },
        { label: "Reviews", value: "Reviews" },
        { label: "Prospecting", value: "Prospecting" },
        { label: "Other grind", value: "Other" },
      ]);
      return;
    }
    state.step = "other";
    await botSay("Fair. One line is enough — what’s broken, or what do you want fixed?");
    setChips([
      { label: "Need faster quotes", value: "Need faster quotes" },
      { label: "Need a better site", value: "Need a better site" },
      { label: "Talk to Adil", value: "Talk to Adil" },
    ]);
  }

  async function sendCalendly(lines) {
    state.step = "booked_wait";
    for (const line of lines) await botSay(line);
    await botSay("Grab a time that works — then reply BOOKED so we know you’re set.", {
      link: true,
      linkLabel: "Pick a 30‑min slot",
    });
    setChips([
      { label: "BOOKED ✓", value: "BOOKED" },
      { label: "Need a different time", value: "Need a different time" },
    ]);
  }

  async function talkToAdil() {
    state.step = "booked_wait";
    await botSay("Perfect — Adil’s jumping in on this thread.");
    await botSay("If you want a locked time instead of waiting on chat, grab 30 min here:", {
      link: true,
      linkLabel: "Book with Adil",
    });
    setChips([
      { label: "BOOKED ✓", value: "BOOKED" },
      { label: "I’ll wait for Adil", value: "I’ll wait for Adil" },
    ]);
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
        await botSay("All good — you’re off. Won’t ping again.");
        return;
      }

      if (/talk to adil|just talk|human|real person|adil please|call me/i.test(lower)) {
        await talkToAdil();
        return;
      }

      if (state.step === "booked_wait") {
        if (/booked/i.test(lower)) {
          state.step = "done";
          await botSay("Nice — you’re set. Talk soon.");
          setChips([]);
          return;
        }
        if (/wait for adil|i.?ll wait/i.test(lower)) {
          state.step = "done";
          await botSay("Sounds good. He’ll reply here. Reset the demo anytime.");
          setChips([]);
          return;
        }
        if (/different time|another|resched/i.test(lower)) {
          await botSay("No problem — pick whatever’s open.", {
            link: true,
            linkLabel: "Open Calendly again",
          });
          setChips([{ label: "BOOKED ✓", value: "BOOKED" }]);
          return;
        }
        await botSay("When you’ve got a slot, just reply BOOKED. Or say wait for Adil.");
        setChips([
          { label: "BOOKED ✓", value: "BOOKED" },
          { label: "I’ll wait for Adil", value: "I’ll wait for Adil" },
        ]);
        return;
      }

      if (state.step === "biz") {
        await afterBiz(text);
        return;
      }

      if (state.step === "leak") {
        let lane = null;
        if (/quote/i.test(lower)) lane = "estimator";
        else if (/site|web|convert/i.test(lower)) lane = "web";
        else if (/busy|manual|automat|hours/i.test(lower)) lane = "automation";
        else if (/something else|other/i.test(lower)) lane = "other";
        else lane = detectLane(text) || "other";
        await enterLane(lane);
        return;
      }

      if (state.step === "est_q") {
        let ack = "Got it.";
        if (/same day/i.test(lower)) ack = "Same day already — then you’re ahead of most. Tool still helps when volume spikes.";
        else if (/2–3|2-3|few day/i.test(lower)) ack = "Two–three days is where leads start shopping elsewhere.";
        else if (/week/i.test(lower)) ack = "A week+ is expensive — first written price usually wins.";
        else if (/not sure/i.test(lower)) ack = "Fair — we’ll map it on the call.";

        await botSay(ack);
        await botSay(
          "We set up photo → same-day written ballpark. $500 setup + $50/estimate, or 5–10% of jobs closed. 30-day refund if the bottleneck stays."
        );
        await sendCalendly(["Want a free 30 min to see if it fits?"]);
        return;
      }

      if (state.step === "web_q") {
        let ack = "Got it.";
        if (/have url|url/i.test(lower)) ack = "Send the URL on the call (or paste it here later) — Adil will glance before you meet.";
        else if (/ig|instagram/i.test(lower)) ack = "IG-only is common — a clean site usually pays for itself in a few booked jobs.";
        else if (/no site/i.test(lower)) ack = "Starting from zero is fine — we keep scope tight.";

        await botSay(ack);
        await botSay("Done-for-you rebuild: mobile, clear services, book/contact, basic SEO. Starter around $300 CAD for agreed pages.");
        await sendCalendly(["Want 30 min to lock what you’d need?"]);
        return;
      }

      if (state.step === "auto_q") {
        await botSay(`Yeah — ${text} can eat a week if nobody owns it.`);
        await botSay("We wire done-for-you automation around that bottleneck. Scope + price on the call so we don’t guess wrong.");
        await sendCalendly(["Grab 30 min and Adil will map it:"]);
        return;
      }

      if (state.step === "other") {
        const guessed = detectLane(text);
        if (guessed) {
          await enterLane(guessed);
          return;
        }
        if (isVague(text)) {
          await botSay("Totally fine if it’s fuzzy.");
          await sendCalendly(["30 min with Adil is the fastest way to sort it."]);
          return;
        }
        await botSay("Heard.");
        await sendCalendly(["Let’s put 30 min on the calendar and route it properly."]);
        return;
      }

      if (state.step === "done") {
        if (/^(hi|hey|hello)\b/i.test(text)) {
          await start();
          return;
        }
        await botSay("This thread’s done — hit Reset to try another path, or book here:", {
          link: true,
          linkLabel: "Calendly",
        });
        return;
      }

      if (/^(hi|hey|hello)\b/i.test(text)) {
        await start();
        return;
      }

      state.step = "leak";
      await botSay(
        "Where are you losing money right now — slow quotes, a site that doesn’t convert, or busywork eating the week?"
      );
      leakChips();
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
