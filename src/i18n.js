import { safeGet, safeSet } from './storage.js';

const STORAGE_KEY = 'giwa-watchdog-lang';

export const DEFAULT_LANG = 'en';
export const LANGS = ['en', 'fr', 'es', 'uk'];
export const LANG_LABELS = { en: 'EN', fr: 'FR', es: 'ES', uk: 'UA' };
export const LOCALE_MAP = { en: 'en-US', fr: 'fr-FR', es: 'es-ES', uk: 'uk-UA' };

const en = {
  app: {
    title: 'GIWA Bridge Watchdog',
    tagline: 'Finds ETH bridge withdrawals stuck between Ethereum Sepolia and GIWA Sepolia',
  },
  controls: {
    themeToLight: 'Switch to light theme',
    themeToDark: 'Switch to dark theme',
    language: 'Language',
  },
  stats: {
    heading: 'Network-wide withdrawal stats',
    sourceAll: 'OptimismPortal2 logs on L1 · since network launch',
    sourceWindow: 'OptimismPortal2 logs on L1 · last ~{days} days (fallback RPC)',
    proven: 'Proven',
    finalized: 'Finalized',
    pending: 'Pending finalize',
    overdue: 'Stuck (overdue)',
    fallbackNote:
      'Primary RPC unreachable — showing a recent window from a fallback public RPC, not the full history. The numbers above only cover that window.',
    footnote:
      "Doesn't count withdrawals that haven't even been proven yet — the real stuck total is higher. The ~{days}-day challenge period is an estimate, not yet confirmed by GIWA — see the README.",
    loading: 'Loading network-wide stats from OptimismPortal2…',
    error: 'Network stats temporarily unavailable: {message}',
  },
  search: {
    placeholder: '0x… wallet address',
    button: 'Check address',
    step1: 'Scanning GIWA Sepolia (L2)…',
    step2: 'Scanning Ethereum Sepolia (L1)…',
    step3: 'Matching withdrawal steps…',
    invalidAddress: "This doesn't look like a wallet address — expected 0x… followed by 40 hex characters.",
    scanFailed: 'Could not load data: {message}',
    l1Unavailable:
      'L2 (GIWA Sepolia) data loaded. The L1 source ({base}) is unavailable: {message}. Prove/finalize status cannot be shown.',
    noTx: 'No bridge transactions found for this address (checked the last {l2} outgoing tx on L2 and {l1} on L1).',
    deepHint: 'Deep scan: up to {l2} tx on L2, {l1} tx on L1 — this can take a minute.',
  },
  scanDeeper: {
    note:
      'This address has older transactions beyond the normal scan window ({l2scanned}/{l2max} on L2, {l1scanned}/{l1max} on L1 — limit reached, history continues further). There may be more stuck withdrawals hiding further back for a heavily-used wallet.',
    button: 'Scan deeper (up to {l2}/{l1} tx, slower)',
  },
  sections: {
    withdrawalsTitle: 'Withdrawals',
    withdrawalsSub: 'L2 → L1 · GIWA Sepolia → Ethereum Sepolia',
    withdrawalsNote:
      'Every withdrawal goes through 3 steps: <b>initiate</b> on L2 → <b>prove</b> on L1 (within a time window) → <b>finalize</b> on L1 (after the challenge period). It can get stuck at any step.',
    depositsTitle: 'Deposits',
    depositsSub: 'L1 → L2 · Ethereum Sepolia → GIWA Sepolia',
    depositsNote: 'A deposit is usually credited within 1–3 minutes. Stuck deposits are rare, but they happen.',
    emptyWithdrawals: 'No withdrawals found for this address.',
    emptyDeposits: 'No deposits found for this address.',
  },
  stepper: { initiate: 'Initiate', prove: 'Prove', finalize: 'Finalize' },
  verdict: { done: 'Done', stuck: 'Stuck', pending: 'Pending', unknown: 'Unknown' },
  status: {
    needsProve: {
      label: 'Not proven yet',
      action: "Initiated on L2 but not proven on L1 yet — without this step, it will stay stuck forever.",
    },
    challenge: {
      label: 'In challenge period — ~{days}d left',
      action: 'Nothing to do yet. Wait for the challenge period to end, then finalize.',
    },
    ready: {
      label: 'Ready to finalize',
      action: 'The challenge period is over — call finalize on L1, or the funds stay stuck.',
    },
    done: { label: 'Completed', action: 'Nothing left to do — this withdrawal arrived on L1.' },
    failed: {
      label: 'Finalize reverted',
      action: 'Finalize ran but the L2 call failed — check the transaction on the L1 explorer, you may need to retry.',
    },
    unknown: {
      label: 'L1 status unknown',
      action: "Couldn't read the L1 explorer — check manually whether prove/finalize happened.",
    },
  },
  card: {
    initiateRow: 'Initiate',
    proveRow: 'Prove',
    finalizeRow: 'Finalize',
    l1TxRow: 'L1 tx',
    hash: 'Withdrawal hash',
    messageOnly: 'message only (0 ETH)',
    depositBadge: 'Deposit initiated on L1',
    depositAction: 'Usually credited on L2 within 1–3 minutes. Check the address on the {link} if it takes longer.',
    depositActionLinkLabel: 'GIWA Sepolia explorer',
  },
  footer: {
    data: 'Data read directly from the public Blockscout APIs of {l2link} and {l1link}. Nothing is ever signed, no wallet is connected — only public data, read in your browser.',
    l2linkLabel: 'GIWA Sepolia',
    l1linkLabel: 'Ethereum Sepolia',
    disclaimer:
      'Not affiliated with the official GIWA project. GIWA Sepolia is a testnet — mainnet and any token do not exist yet. Watch out for phishing sites using the GIWA brand.',
    github: 'GIWA on GitHub',
    docs: 'GIWA docs',
  },
};

const fr = {
  app: {
    title: 'GIWA Bridge Watchdog',
    tagline: 'Repère les retraits ETH bloqués entre Ethereum Sepolia et GIWA Sepolia',
  },
  controls: {
    themeToLight: 'Passer au thème clair',
    themeToDark: 'Passer au thème sombre',
    language: 'Langue',
  },
  stats: {
    heading: 'Statistiques des retraits sur tout le réseau',
    sourceAll: 'Journaux OptimismPortal2 sur L1 · depuis le lancement du réseau',
    sourceWindow: 'Journaux OptimismPortal2 sur L1 · ~{days} derniers jours (RPC de secours)',
    proven: 'Prouvés',
    finalized: 'Finalisés',
    pending: 'En attente de finalisation',
    overdue: 'Bloqués (en retard)',
    fallbackNote:
      'RPC principal inaccessible — affichage d\'une fenêtre récente via un RPC public de secours, pas de l\'historique complet. Les chiffres ci-dessus ne couvrent que cette fenêtre.',
    footnote:
      "Ne compte pas les retraits qui n'ont même pas encore été prouvés — le total réel bloqué est plus élevé. La période de contestation de ~{days} jours est une estimation, non confirmée par GIWA — voir le README.",
    loading: 'Chargement des statistiques réseau depuis OptimismPortal2…',
    error: 'Statistiques réseau temporairement indisponibles : {message}',
  },
  search: {
    placeholder: '0x… adresse de portefeuille',
    button: 'Vérifier l\'adresse',
    step1: 'Analyse de GIWA Sepolia (L2)…',
    step2: 'Analyse d\'Ethereum Sepolia (L1)…',
    step3: 'Association des étapes de retrait…',
    invalidAddress: "Cela ne ressemble pas à une adresse de portefeuille — 0x… suivi de 40 caractères hexadécimaux attendu.",
    scanFailed: 'Impossible de charger les données : {message}',
    l1Unavailable:
      "Données L2 (GIWA Sepolia) chargées. La source L1 ({base}) est indisponible : {message}. Le statut prove/finalize ne peut pas être affiché.",
    noTx: "Aucune transaction de pont trouvée pour cette adresse (vérifié les {l2} dernières tx sortantes sur L2 et {l1} sur L1).",
    deepHint: "Analyse approfondie : jusqu'à {l2} tx sur L2, {l1} tx sur L1 — cela peut prendre une minute.",
  },
  scanDeeper: {
    note:
      "Cette adresse a des transactions plus anciennes au-delà de la fenêtre d'analyse normale ({l2scanned}/{l2max} sur L2, {l1scanned}/{l1max} sur L1 — limite atteinte, l'historique continue). Il peut y avoir d'autres retraits bloqués plus loin pour un portefeuille très actif.",
    button: "Analyser plus profond (jusqu'à {l2}/{l1} tx, plus lent)",
  },
  sections: {
    withdrawalsTitle: 'Retraits',
    withdrawalsSub: 'L2 → L1 · GIWA Sepolia → Ethereum Sepolia',
    withdrawalsNote:
      'Chaque retrait passe par 3 étapes : <b>initiate</b> sur L2 → <b>prove</b> sur L1 (dans une fenêtre de temps) → <b>finalize</b> sur L1 (après la période de contestation). Il peut se bloquer à n\'importe quelle étape.',
    depositsTitle: 'Dépôts',
    depositsSub: 'L1 → L2 · Ethereum Sepolia → GIWA Sepolia',
    depositsNote: 'Un dépôt est généralement crédité en 1 à 3 minutes. Les dépôts bloqués sont rares, mais cela arrive.',
    emptyWithdrawals: 'Aucun retrait trouvé pour cette adresse.',
    emptyDeposits: 'Aucun dépôt trouvé pour cette adresse.',
  },
  stepper: { initiate: 'Initiate', prove: 'Prove', finalize: 'Finalize' },
  verdict: { done: 'Terminé', stuck: 'Bloqué', pending: 'En attente', unknown: 'Inconnu' },
  status: {
    needsProve: {
      label: 'Pas encore prouvé',
      action: "Initié sur L2 mais pas encore prouvé sur L1 — sans cette étape, il restera bloqué pour toujours.",
    },
    challenge: {
      label: 'En période de contestation — ~{days} j restants',
      action: "Rien à faire pour le moment. Attendez la fin de la période de contestation, puis finalisez.",
    },
    ready: {
      label: 'Prêt à finaliser',
      action: "La période de contestation est terminée — appelez finalize sur L1, sinon les fonds restent bloqués.",
    },
    done: { label: 'Terminé', action: 'Plus rien à faire — ce retrait est arrivé sur L1.' },
    failed: {
      label: 'Finalize a échoué',
      action: "Finalize a été exécuté mais l'appel L2 a échoué — vérifiez la transaction sur l'explorateur L1, un nouvel essai est peut-être nécessaire.",
    },
    unknown: {
      label: 'Statut L1 inconnu',
      action: "Impossible de lire l'explorateur L1 — vérifiez manuellement si prove/finalize a eu lieu.",
    },
  },
  card: {
    initiateRow: 'Initiate',
    proveRow: 'Prove',
    finalizeRow: 'Finalize',
    l1TxRow: 'Tx L1',
    hash: 'Hash du retrait',
    messageOnly: 'message seulement (0 ETH)',
    depositBadge: 'Dépôt initié sur L1',
    depositAction: "Généralement crédité sur L2 en 1 à 3 minutes. Vérifiez l'adresse sur {link} si cela prend plus de temps.",
    depositActionLinkLabel: "l'explorateur GIWA Sepolia",
  },
  footer: {
    data: 'Données lues directement depuis les API Blockscout publiques de {l2link} et {l1link}. Rien n\'est jamais signé, aucun portefeuille n\'est connecté — seulement des données publiques, lues dans votre navigateur.',
    l2linkLabel: 'GIWA Sepolia',
    l1linkLabel: 'Ethereum Sepolia',
    disclaimer:
      "Non affilié au projet officiel GIWA. GIWA Sepolia est un testnet — le mainnet et un éventuel token n'existent pas encore. Attention aux sites de phishing utilisant la marque GIWA.",
    github: 'GIWA sur GitHub',
    docs: 'Documentation GIWA',
  },
};

const es = {
  app: {
    title: 'GIWA Bridge Watchdog',
    tagline: 'Encuentra retiros de ETH atascados entre Ethereum Sepolia y GIWA Sepolia',
  },
  controls: {
    themeToLight: 'Cambiar a tema claro',
    themeToDark: 'Cambiar a tema oscuro',
    language: 'Idioma',
  },
  stats: {
    heading: 'Estadísticas de retiros de toda la red',
    sourceAll: 'Registros de OptimismPortal2 en L1 · desde el lanzamiento de la red',
    sourceWindow: 'Registros de OptimismPortal2 en L1 · últimos ~{days} días (RPC de respaldo)',
    proven: 'Probados',
    finalized: 'Finalizados',
    pending: 'Pendientes de finalizar',
    overdue: 'Atascados (vencidos)',
    fallbackNote:
      'El RPC principal no está disponible — mostrando una ventana reciente desde un RPC público de respaldo, no el historial completo. Las cifras anteriores solo cubren esa ventana.',
    footnote:
      'No cuenta los retiros que ni siquiera han sido probados todavía — el total real atascado es mayor. El período de impugnación de ~{days} días es una estimación, aún no confirmada por GIWA — ver el README.',
    loading: 'Cargando estadísticas de red desde OptimismPortal2…',
    error: 'Estadísticas de red temporalmente no disponibles: {message}',
  },
  search: {
    placeholder: '0x… dirección de billetera',
    button: 'Comprobar dirección',
    step1: 'Analizando GIWA Sepolia (L2)…',
    step2: 'Analizando Ethereum Sepolia (L1)…',
    step3: 'Relacionando los pasos del retiro…',
    invalidAddress: 'Esto no parece una dirección de billetera — se esperaba 0x… seguido de 40 caracteres hexadecimales.',
    scanFailed: 'No se pudieron cargar los datos: {message}',
    l1Unavailable:
      'Datos de L2 (GIWA Sepolia) cargados. La fuente L1 ({base}) no está disponible: {message}. No se puede mostrar el estado de prove/finalize.',
    noTx: 'No se encontraron transacciones de puente para esta dirección (se revisaron las últimas {l2} tx salientes en L2 y {l1} en L1).',
    deepHint: 'Análisis profundo: hasta {l2} tx en L2, {l1} tx en L1 — puede tardar un minuto.',
  },
  scanDeeper: {
    note:
      'Esta dirección tiene transacciones más antiguas fuera de la ventana de análisis normal ({l2scanned}/{l2max} en L2, {l1scanned}/{l1max} en L1 — límite alcanzado, el historial continúa). Puede haber más retiros atascados más atrás para una billetera muy activa.',
    button: 'Analizar más a fondo (hasta {l2}/{l1} tx, más lento)',
  },
  sections: {
    withdrawalsTitle: 'Retiros',
    withdrawalsSub: 'L2 → L1 · GIWA Sepolia → Ethereum Sepolia',
    withdrawalsNote:
      'Cada retiro pasa por 3 pasos: <b>initiate</b> en L2 → <b>prove</b> en L1 (dentro de una ventana de tiempo) → <b>finalize</b> en L1 (tras el período de impugnación). Puede atascarse en cualquier paso.',
    depositsTitle: 'Depósitos',
    depositsSub: 'L1 → L2 · Ethereum Sepolia → GIWA Sepolia',
    depositsNote: 'Un depósito suele acreditarse en 1–3 minutos. Los depósitos atascados son raros, pero ocurren.',
    emptyWithdrawals: 'No se encontraron retiros para esta dirección.',
    emptyDeposits: 'No se encontraron depósitos para esta dirección.',
  },
  stepper: { initiate: 'Initiate', prove: 'Prove', finalize: 'Finalize' },
  verdict: { done: 'Completado', stuck: 'Atascado', pending: 'Pendiente', unknown: 'Desconocido' },
  status: {
    needsProve: {
      label: 'Aún no probado',
      action: 'Iniciado en L2 pero aún no probado en L1 — sin este paso, quedará atascado para siempre.',
    },
    challenge: {
      label: 'En período de impugnación — quedan ~{days} días',
      action: 'Nada que hacer todavía. Espera a que termine el período de impugnación y luego finaliza.',
    },
    ready: {
      label: 'Listo para finalizar',
      action: 'El período de impugnación terminó — llama a finalize en L1, o los fondos quedarán atascados.',
    },
    done: { label: 'Completado', action: 'Nada más que hacer — este retiro llegó a L1.' },
    failed: {
      label: 'Finalize falló',
      action: 'Finalize se ejecutó pero la llamada en L2 falló — revisa la transacción en el explorador L1, puede que debas reintentarlo.',
    },
    unknown: {
      label: 'Estado L1 desconocido',
      action: 'No se pudo leer el explorador L1 — comprueba manualmente si ocurrió prove/finalize.',
    },
  },
  card: {
    initiateRow: 'Initiate',
    proveRow: 'Prove',
    finalizeRow: 'Finalize',
    l1TxRow: 'Tx en L1',
    hash: 'Hash del retiro',
    messageOnly: 'solo mensaje (0 ETH)',
    depositBadge: 'Depósito iniciado en L1',
    depositAction: 'Normalmente se acredita en L2 en 1–3 minutos. Revisa la dirección en {link} si tarda más.',
    depositActionLinkLabel: 'el explorador de GIWA Sepolia',
  },
  footer: {
    data: 'Datos leídos directamente de las API públicas de Blockscout de {l2link} y {l1link}. Nunca se firma nada, no se conecta ninguna billetera — solo datos públicos, leídos en tu navegador.',
    l2linkLabel: 'GIWA Sepolia',
    l1linkLabel: 'Ethereum Sepolia',
    disclaimer:
      'No está afiliado al proyecto oficial de GIWA. GIWA Sepolia es una testnet — la mainnet y cualquier token todavía no existen. Cuidado con los sitios de phishing que usan la marca GIWA.',
    github: 'GIWA en GitHub',
    docs: 'Documentación de GIWA',
  },
};

const uk = {
  app: {
    title: 'GIWA Bridge Watchdog',
    tagline: 'Знаходить «застряглі» виведення ETH між Ethereum Sepolia та GIWA Sepolia',
  },
  controls: {
    themeToLight: 'Перемкнути на світлу тему',
    themeToDark: 'Перемкнути на темну тему',
    language: 'Мова',
  },
  stats: {
    heading: 'Статистика виведень по всій мережі',
    sourceAll: 'Логи OptimismPortal2 на L1 · від запуску мережі',
    sourceWindow: 'Логи OptimismPortal2 на L1 · останні ~{days} дн. (резервний RPC)',
    proven: 'Proven',
    finalized: 'Finalized',
    pending: 'Очікують finalize',
    overdue: 'Застрягли (просрочено)',
    fallbackNote:
      'Основний RPC недоступний — показано дані з резервного публічного RPC лише за недавнє вікно, а не всю історію. Цифри вище стосуються лише цього вікна.',
    footnote:
      'Не враховує виведення, які ще навіть не пройшли prove — реальна кількість застряглих більша. ~{days}-денний challenge-період — це оцінка, не підтверджена GIWA офіційно, див. README.',
    loading: 'Завантажуємо мережеву статистику з OptimismPortal2…',
    error: 'Мережева статистика тимчасово недоступна: {message}',
  },
  search: {
    placeholder: '0x… адреса кошелька',
    button: 'Перевірити адресу',
    step1: 'Скануємо GIWA Sepolia (L2)…',
    step2: 'Скануємо Ethereum Sepolia (L1)…',
    step3: 'Звіряємо кроки виведення…',
    invalidAddress: 'Це не схоже на адресу кошелька — очікується 0x… і 40 hex-символів.',
    scanFailed: 'Не вдалося отримати дані: {message}',
    l1Unavailable:
      'Дані L2 (GIWA Sepolia) отримано. Джерело L1 ({base}) недоступне: {message}. Статус prove/finalize показати не можемо.',
    noTx: 'Транзакцій мосту для цієї адреси не знайдено (перевірено останні {l2} вихідних tx на L2 і {l1} на L1).',
    deepHint: 'Глибоке сканування: до {l2} tx на L2, {l1} tx на L1 — може зайняти хвилину.',
  },
  scanDeeper: {
    note:
      'У цієї адреси є ще старіші транзакції за межами звичайного вікна сканування ({l2scanned}/{l2max} на L2, {l1scanned}/{l1max} на L1 — ліміт досягнуто, історія продовжується далі). Можливо, там є ще застряглі виведення великого фарм-кошелька.',
    button: 'Сканувати глибше (до {l2}/{l1} tx, повільніше)',
  },
  sections: {
    withdrawalsTitle: 'Виведення',
    withdrawalsSub: 'L2 → L1 · GIWA Sepolia → Ethereum Sepolia',
    withdrawalsNote:
      'Кожне виведення проходить 3 кроки: <b>initiate</b> на L2 → <b>prove</b> на L1 (у часовому вікні) → <b>finalize</b> на L1 (після challenge-періоду). Застрягти можна на будь-якому кроці.',
    depositsTitle: 'Депозити',
    depositsSub: 'L1 → L2 · Ethereum Sepolia → GIWA Sepolia',
    depositsNote: 'Депозит зазвичай зараховується за 1–3 хвилини. Застряглі депозити рідкісні, але трапляються.',
    emptyWithdrawals: 'Виведень не знайдено для цієї адреси.',
    emptyDeposits: 'Депозитів не знайдено для цієї адреси.',
  },
  stepper: { initiate: 'Initiate', prove: 'Prove', finalize: 'Finalize' },
  verdict: { done: 'Завершено', stuck: 'Застрягло', pending: 'Очікує', unknown: 'Невідомо' },
  status: {
    needsProve: {
      label: 'Ще не proven',
      action: 'Ініційоване на L2, але ще не підтверджене (proven) на L1 — без цього кроку воно застрягне назавжди.',
    },
    challenge: {
      label: 'У challenge-періоді — лишилось ~{days} дн.',
      action: 'Нічого робити не треба. Зачекайте завершення challenge-періоду, потім викличте finalize.',
    },
    ready: {
      label: 'Готове до finalize',
      action: 'Challenge-період минув — викличте finalize на L1, інакше кошти застрягнуть.',
    },
    done: { label: 'Завершено', action: 'Більше нічого робити не треба — це виведення дійшло на L1.' },
    failed: {
      label: 'Finalize провалився',
      action: 'Finalize виконано, але L2-виклик провалився — перевірте транзакцію на L1 explorer, можливо, треба повторити.',
    },
    unknown: {
      label: 'Статус L1 невідомий',
      action: 'Не вдалось прочитати L1 explorer — перевірте вручну, чи зроблено prove/finalize.',
    },
  },
  card: {
    initiateRow: 'Initiate',
    proveRow: 'Prove',
    finalizeRow: 'Finalize',
    l1TxRow: 'L1 tx',
    hash: 'withdrawalHash',
    messageOnly: 'лише повідомлення (0 ETH)',
    depositBadge: 'Депозит ініційовано на L1',
    depositAction: 'Зазвичай зараховується на L2 за 1–3 хв. Перевірте адресу на {link}, якщо довше.',
    depositActionLinkLabel: 'GIWA Sepolia explorer',
  },
  footer: {
    data: 'Дані напряму з публічних Blockscout API: {l2link} та {l1link}. Нічого не підписується, жодного кошелька не підключено — лише читання публічних даних у вашому браузері.',
    l2linkLabel: 'GIWA Sepolia',
    l1linkLabel: 'Ethereum Sepolia',
    disclaimer:
      "Непов'язано з офіційним проєктом GIWA. GIWA Sepolia — тестова мережа, mainnet і токен ще не існують. Будьте обережні з фішинговими сайтами під брендом GIWA.",
    github: 'GIWA on GitHub',
    docs: 'GIWA docs',
  },
};

const translations = { en, fr, es, uk };

function get(obj, path) {
  return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
}

let currentLang = DEFAULT_LANG;

export function detectLang() {
  const fromUrl = new URL(window.location.href).searchParams.get('lang');
  if (fromUrl && LANGS.includes(fromUrl)) return fromUrl;
  const fromStorage = safeGet(STORAGE_KEY);
  if (fromStorage && LANGS.includes(fromStorage)) return fromStorage;
  return DEFAULT_LANG;
}

export function getLang() {
  return currentLang;
}

export function setLang(lang) {
  currentLang = LANGS.includes(lang) ? lang : DEFAULT_LANG;
  safeSet(STORAGE_KEY, currentLang);
  document.documentElement.setAttribute('lang', currentLang);
  return currentLang;
}

export function initLang() {
  return setLang(detectLang());
}

export function t(key, vars) {
  const raw = get(translations[currentLang], key) ?? get(translations[DEFAULT_LANG], key) ?? key;
  if (typeof raw !== 'string' || !vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : `{${k}}`));
}
