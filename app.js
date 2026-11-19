(() => {
  const SUITS = ['Hearts', 'Diamonds', 'Spades', 'Clubs'];
  const SUIT_MARK = { Hearts: '♥', Diamonds: '♦', Spades: '♠', Clubs: '♣' };
  const cards = window.CARDERECISE_CARDS;
  const exercises = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  let plan = null;

  const $ = (id) => document.getElementById(id);
  const shuffle = (items) => {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };
  const pick = (items) => items[Math.floor(Math.random() * items.length)];
  const rankValue = (card) => {
    if (card.jokerValue !== undefined) return card.jokerValue;
    return card.rank === 'A' ? 1 : card.rank === 'J' ? 11 : card.rank === 'Q' ? 12 : card.rank === 'K' ? 13 : Number(card.rank) || 13;
  };
  const countValue = (rank) => rank === 'Joker' || rank === 'K' ? 13 : rank === 'Q' ? 12 : rank === 'J' ? 11 : Math.max(5, Number(rank) || 5);
  const freshDeck = () => shuffle(cards);

  function askJoker(mode, suits, exerciseRanks = []) {
    const dialog = $('joker-dialog');
    const form = $('joker-form');
    const suitSelect = $('joker-suit');
    const exerciseLabel = $('joker-exercise-label');
    const valueLabel = $('joker-value-label');
    $('joker-title').textContent = mode === 'assignment' ? 'Choose the Joker’s suit and exercise' : 'Choose the Joker’s suit and value';
    $('joker-description').textContent = mode === 'assignment'
      ? 'Assign this wild card to an open suit and an exercise that has not been used.'
      : 'Choose which suit receives this Joker and how many repetitions it is worth.';
    suitSelect.replaceChildren(...suits.map((suit) => new Option(`${SUIT_MARK[suit]} ${suit}`, suit)));
    $('joker-suit-label').classList.remove('hidden');
    exerciseLabel.classList.toggle('hidden', mode !== 'assignment');
    valueLabel.classList.toggle('hidden', mode !== 'repetition');
    $('joker-value-caption').textContent = 'Repetition value';
    $('joker-value').value = '13';
    if (mode === 'assignment') {
      const exerciseSelect = $('joker-exercise');
      exerciseSelect.replaceChildren(...exerciseRanks.map((rank) => {
        const card = cards.find((item) => item.rank === rank && item.suit === 'Hearts');
        return new Option(`${rank} — ${card?.exercise || rank}`, rank);
      }));
    }
    return new Promise((resolve) => {
      const onSubmit = (event) => {
        event.preventDefault();
        const answer = mode === 'assignment'
          ? { suit: suitSelect.value, exerciseRank: $('joker-exercise').value }
          : { suit: suitSelect.value, value: Math.min(50, Math.max(0, Number($('joker-value').value) || 0)) };
        dialog.close();
        resolve(answer);
      };
      const keepOpen = (event) => event.preventDefault();
      form.addEventListener('submit', onSubmit, { once: true });
      dialog.addEventListener('cancel', keepOpen, { once: true });
      dialog.showModal();
    });
  }

  async function makeAssignments() {
    const deck = freshDeck();
    const assignment = {};
    const usedExercises = new Set();
    const discarded = [];
    let drawnCount = 0;
    while (Object.keys(assignment).length < 4 && deck.length) {
      const card = deck.pop();
      drawnCount++;
      if (card.rank === 'Joker') {
        const openSuits = SUITS.filter((s) => !assignment[s]);
        const openExercises = exercises.filter((r) => !usedExercises.has(r));
        const { suit, exerciseRank } = await askJoker('assignment', openSuits, openExercises);
        assignment[suit] = { ...card, exerciseRank, exercise: cards.find((c) => c.rank === exerciseRank && c.suit === 'Hearts')?.exercise };
        usedExercises.add(exerciseRank);
        discarded.push(`${card.name} assigned to ${suit} as ${assignment[suit].exercise}.`);
      } else if (!assignment[card.suit] && !usedExercises.has(card.rank)) {
        assignment[card.suit] = { ...card, exerciseRank: card.rank };
        usedExercises.add(card.rank);
      } else {
        discarded.push(`${card.name} set aside (suit or exercise already assigned).`);
      }
    }
    return { assignment, discarded, draws: drawnCount };
  }

  function renderAssignments() {
    const container = $('assignments');
    container.replaceChildren();
    for (const suit of SUITS) {
      const item = plan.assignment[suit];
      const card = document.createElement('article');
      card.className = 'assignment-card';
      card.innerHTML = `<div class="suit-label">${SUIT_MARK[suit]} ${suit}</div><img src="${item.src}" alt="${item.name}"><h3>${item.exercise}</h3><p>${item.name}</p>`;
      container.append(card);
    }
    $('assignment-note').textContent = `The assignment phase drew ${plan.assignmentDraws} cards, setting aside repeats until all four suits had unique exercises. The deck is reshuffled for the repetition phase.`;
  }

  function suitTotalForRound(roundCards, suit) {
    return roundCards.reduce((sum, card) => sum + (card.assignedSuit === suit || (card.rank !== 'Joker' && card.suit === suit) ? rankValue(card) : 0), 0);
  }

  async function makeRounds(settings) {
    const deck = freshDeck();
    const rounds = [];
    let cursor = 0;
    while (cursor < deck.length) {
      const countCard = deck[cursor++];
      const requestedCount = settings.special ? 5 : countValue(countCard.rank);
      const targetCount = Math.min(requestedCount, deck.length - cursor);
      const drawnCards = deck.slice(cursor, cursor + targetCount);
      const repCards = [];
      for (const card of drawnCards) {
        if (card.rank === 'Joker') {
          const { suit, value } = await askJoker('repetition', SUITS);
          repCards.push({ ...card, assignedSuit: suit, jokerValue: value });
        } else {
          repCards.push(card);
        }
      }
      cursor += repCards.length;
      const totals = {};
      const reps = {};
      for (const suit of SUITS) {
        totals[suit] = suitTotalForRound(repCards, suit);
        const cardsForSuit = repCards.filter((card) => card.assignedSuit === suit || (card.rank !== 'Joker' && card.suit === suit)).length;
        reps[suit] = cardsForSuit === 0 ? settings.defaultReps : Math.max(settings.minimumReps, settings.baseReps + totals[suit]);
      }
      rounds.push({ number: rounds.length + 1, countCard, countValue: requestedCount, targetCount, repCards, totals, reps });
    }
    return rounds;
  }

  function createSettings() {
    return {
      defaultReps: Math.max(0, Number($('default-reps').value) || 0),
      minimumReps: Math.max(0, Number($('minimum-reps').value) || 0),
      baseReps: Math.max(0, Number($('base-reps').value) || 0),
      special: $('special-mode').checked
    };
  }

  function cardShortName(card) {
    return card.rank === 'Joker' ? `Joker (${card.jokerValue})→${card.assignedSuit}` : `${card.rank}${SUIT_MARK[card.suit]}`;
  }

  function renderRounds() {
    const assignmentLabels = SUITS.map((s) => `${SUIT_MARK[s]} ${plan.assignment[s].exercise}`).join(' · ');
    $('plan-summary').textContent = `${plan.settings.special ? 'Special mode: 5 repetition cards per round.' : 'Count cards control how many repetition cards are drawn.'} Exercises: ${assignmentLabels}. ${plan.rounds.length} rounds in this plan.`;
    const table = $('round-table');
    const head = `<thead><tr><th>Round</th><th>Count card<span>cards to draw</span></th>${SUITS.map((s) => `<th>${SUIT_MARK[s]} ${s}<span>${plan.assignment[s].exercise}</span></th>`).join('')}</tr></thead>`;
    const body = plan.rounds.map((round) => {
      const drawLabel = round.countValue > round.targetCount ? `${round.targetCount} drawn of ${round.countValue}` : `${round.targetCount} cards`;
      return `<tr><td>${round.number}</td><td><span class="count-chip"><strong>${round.countCard.rank === 'Joker' ? 'Joker' : round.countCard.rank}</strong><small>${drawLabel}</small></span></td>${SUITS.map((s) => `<td>${round.reps[s]}</td>`).join('')}</tr>`;
    }).join('');
    table.innerHTML = `${head}<tbody>${body}</tbody>`;
    $('round-details').innerHTML = plan.rounds.map((round) => {
      const draws = round.repCards.length ? round.repCards.map(cardShortName).join(' · ') : 'No repetition cards remained.';
      return `<article class="round-detail"><h3>Round ${round.number} · ${round.countCard.rank === 'Joker' ? 'Joker' : round.countCard.rank} count card</h3><p>Repetition cards: ${draws}</p></article>`;
    }).join('');
  }

  function buildPrintPlan() {
    const date = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    const settingsLine = `Default: ${plan.settings.defaultReps} · Minimum: ${plan.settings.minimumReps} · Base: ${plan.settings.baseReps} · ${plan.settings.special ? 'Special mode: fixed 5-card draws' : 'Standard count-card mode'}`;
    const assignments = SUITS.map((suit) => {
      const card = plan.assignment[suit];
      return `<div class="print-assignment"><img src="${card.src}" alt=""><strong>${SUIT_MARK[suit]} ${suit}</strong><span>${card.exercise}</span><span>${card.name}</span></div>`;
    }).join('');
    const tableRows = plan.rounds.map((round) => {
      const drawLabel = round.countValue > round.targetCount ? `${round.targetCount} drawn of ${round.countValue}` : `${round.targetCount} drawn`;
      return `<tr><td>${round.number}</td><td>${round.countCard.rank === 'Joker' ? 'Joker' : round.countCard.rank} (${drawLabel})</td>${SUITS.map((s) => `<td>${round.reps[s]}</td>`).join('')}</tr><tr><td colspan="6" class="print-cards">Round ${round.number} cards: ${round.repCards.map(cardShortName).join(' · ') || 'none'}</td></tr>`;
    }).join('');
    $('print-area').innerHTML = `<div class="print-title"><h1>Cardercise Workout Plan</h1><p>${date} · Cardercise by Bobby Allen</p></div><div class="print-settings">${settingsLine}</div><h2 class="print-heading">Phase 1 · Exercise assignments</h2><div class="print-assignments">${assignments}</div><h2 class="print-heading">Phase 2 · Repetition plan</h2><table class="print-table"><thead><tr><th>Round</th><th>Count card (draw)</th>${SUITS.map((s) => `<th>${SUIT_MARK[s]} ${s}<br>${plan.assignment[s].exercise}</th>`).join('')}</tr></thead><tbody>${tableRows}</tbody></table><p class="print-safety">Use a comfortable range and move at your own pace. Talk with your medical professional before starting an exercise program. Stop if you feel pain, dizziness, chest discomfort, or unusual shortness of breath.</p><p class="print-footer">Shuffle. Draw. Move at your own pace. · The Wondering Wanderer</p>`;
  }

  $('plan-button').addEventListener('click', async (event) => {
    event.preventDefault();
    const button = $('plan-button');
    button.disabled = true;
    try {
      plan = { ...(await makeAssignments()), settings: createSettings() };
      plan.assignmentDraws = plan.draws;
      renderAssignments();
      $('phase-one').classList.remove('hidden');
      $('phase-two').classList.add('hidden');
      $('phase-one').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } finally {
      button.disabled = false;
    }
  });

  $('deal-button').addEventListener('click', async () => {
    const button = $('deal-button');
    button.disabled = true;
    try {
      plan.rounds = await makeRounds(plan.settings);
      renderRounds();
      $('phase-two').classList.remove('hidden');
      $('phase-two').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } finally {
      button.disabled = false;
    }
  });

  $('print-button').addEventListener('click', async () => {
    buildPrintPlan();
    await Promise.all([...$('print-area').querySelectorAll('img')].map((image) => image.decode().catch(() => {})));
    window.print();
  });

  $('again-button').addEventListener('click', () => {
    $('phase-one').classList.add('hidden');
    $('phase-two').classList.add('hidden');
    $('setup-screen').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js').catch(() => {}));
  }
})();
