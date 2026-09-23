import { SimulatedClient, ClientRequestType } from '../types/simulation';

interface ClientTemplate {
  name: string;
  avatar: string;
  company: string;
  phone: string;
  requestType: ClientRequestType;
  title: string;
  dialogue: string;
  requestedDetails: {
    item?: string;
    duration?: string;
    issue?: string;
    budget?: string;
  };
}

export const CLIENT_TEMPLATES: ClientTemplate[] = [
  // --- АРЕНДА (RENTAL) ---
  {
    name: 'Артем Васильев',
    avatar: '🚴‍♂️',
    company: 'Самокат',
    phone: '+7 (916) 450-22-11',
    requestType: 'RENTAL',
    title: 'Аренда электробайка на 2 недели',
    dialogue: 'Привет! Устроился в даркстор Самоката на Соколе. Нужен шустрый электробайк на 2 недели, чтобы батареи хватало на смену 8-10 часов. Есть свободный в наличии?',
    requestedDetails: {
      item: 'Электровелосипед (Minako / Wenbox)',
      duration: '14 дней',
      budget: 'Посуточный или недельный тариф',
    },
  },
  {
    name: 'Марат Хабибуллин',
    avatar: '📦',
    company: 'Яндекс Еда',
    phone: '+7 (926) 881-34-55',
    requestType: 'RENTAL',
    title: 'Срочная аренда на 7 дней + доп. батарея',
    dialogue: 'Здорово! Мой личный байк сгорел вчера, а у меня повышенный слот в Яндексе. Срочно нужен велик в аренду на неделю, и желательно вторую батарею в аренду, чтобы свапать на ходу!',
    requestedDetails: {
      item: 'Электровелосипед + Доп. АКБ',
      duration: '7 дней',
      budget: 'Готов внести залог сразу наличными или картой',
    },
  },
  {
    name: 'Нурлан Жумабаев',
    avatar: '🛵',
    company: 'Купер',
    phone: '+7 (999) 312-90-44',
    requestType: 'RENTAL',
    title: 'Аренда с правом выкупа (Rent-to-own)',
    dialogue: 'Здравствуйте, начальник! Хочу взять байк на длительный срок, желательно с выкупом в собственность на 3-4 месяца. Какие у вас условия по выкупу?',
    requestedDetails: {
      item: 'Электровелосипед (Аренда с выкупом)',
      duration: 'Длительно (с выкупом)',
      budget: 'Фиксированный посуточный платеж',
    },
  },
  {
    name: 'Алексей Смирнов',
    avatar: '⚡',
    company: 'Достависта',
    phone: '+7 (903) 777-12-89',
    requestType: 'RENTAL',
    title: 'Аренда на выходные (тест-драйв)',
    dialogue: 'Добрый день! Хочу подработать в доставке на выходных (пятница-воскресенье). Можно взять байк на 3 дня на пробу?',
    requestedDetails: {
      item: 'Электровелосипед Minako',
      duration: '3 дня',
      budget: 'Стандартный тариф',
    },
  },

  // --- ПОКУПКА В МАГАЗИНЕ (BUY) ---
  {
    name: 'Дмитрий Рогов',
    avatar: '🛍️',
    company: 'Частный курьер',
    phone: '+7 (977) 123-45-67',
    requestType: 'BUY',
    title: 'Покупка держателя телефона с зарядкой и замка',
    dialogue: 'Привет! Мне нужен крепкий металлический держатель для телефона с USB-зарядкой, а то старый пластиковый сломался на кочке. И еще надежный цепной замок.',
    requestedDetails: {
      item: 'Держатель телефона + Замок тросовый/цепной',
      budget: 'До 2 500 ₽',
    },
  },
  {
    name: 'Ильдар Сафин',
    avatar: '🛠️',
    company: 'Яндекс Еда',
    phone: '+7 (915) 344-99-10',
    requestType: 'BUY',
    title: 'Покупка тормозных колодок (2 пары)',
    dialogue: 'Добрый день! У вас есть в наличии тормозные колодки на гидравлику/механику? Возьму сразу 2 комплекта про запас на перед и зад.',
    requestedDetails: {
      item: 'Тормозные колодки (2 комплекта)',
      budget: 'По прайсу склада',
    },
  },
  {
    name: 'Михаил Котов',
    avatar: '🧤',
    company: 'Самокат',
    phone: '+7 (985) 601-77-22',
    requestType: 'BUY',
    title: 'Покупка экипировки (термоварежки на руль и шлем)',
    dialogue: 'Здравствуйте! На улице похолодало, пальцы дубеют. Продаете теплые рукавицы-муфты на руль и недорогой шлем со скидкой?',
    requestedDetails: {
      item: 'Экипировка (варежки на руль / муфты, шлем)',
      budget: 'Оплата СБП или картой',
    },
  },
  {
    name: 'Фарход Каримов',
    avatar: '💡',
    company: 'Купер',
    phone: '+7 (925) 880-14-11',
    requestType: 'BUY',
    title: 'Покупка яркой фары и звонка',
    dialogue: 'Салам алейкум! Вечером в темноте во дворах ничего не видно, штатная фара еле светит. Есть мощная диодная фара "Арктик" или аналог с гудком?',
    requestedDetails: {
      item: 'Фара диодная / Свет + звонок',
      budget: 'Наличные',
    },
  },

  // --- РЕМОНТ И СТО (REPAIR) ---
  {
    name: 'Тимур Алиев',
    avatar: '🔧',
    company: 'Самокат',
    phone: '+7 (968) 555-43-21',
    requestType: 'REPAIR',
    title: 'Прокол заднего колеса (замена камеры)',
    dialogue: 'Беда! Поймал саморез на проезжей части, заднее мотор-колесо спустило в ноль! Можете срочно заклеить или поменять камеру? Заказы горят!',
    requestedDetails: {
      issue: 'Прокол камеры заднего колеса, требуется замена камеры/шиномонтаж',
      budget: 'Оплата сразу',
    },
  },
  {
    name: 'Сергей Поляков',
    avatar: '⚠️',
    company: 'Яндекс Еда',
    phone: '+7 (905) 234-90-11',
    requestType: 'REPAIR',
    title: 'Стерлись колодки, скрежет металла по диску',
    dialogue: 'Привет! Тормоза вообще пропали, ручка проваливается до грипсы, при торможении страшный металлический скрежет. Нужно срочно поменять колодки и прокачать!',
    requestedDetails: {
      issue: 'Критический износ тормозных колодок, регулировка калипера',
      budget: 'По тарифу СТО',
    },
  },
  {
    name: 'Бахром Юсупов',
    avatar: '🔌',
    company: 'Купер',
    phone: '+7 (995) 700-11-33',
    requestType: 'REPAIR',
    title: 'Байк дергается и отключается на скорости',
    dialogue: 'Здравствуйте! Велосипед едет рывками, когда даешь полный газ — дисплей тухнет и мотор вырубается. Похоже на контроллер или контакт фазных проводов. Посмотрите?',
    requestedDetails: {
      issue: 'Диагностика электрики, контроллера и силовой проводки',
      budget: 'Диагностика + ремонт',
    },
  },
  {
    name: 'Виктор Морозов',
    avatar: '🚲',
    company: 'Достависта',
    phone: '+7 (916) 111-22-33',
    requestType: 'REPAIR',
    title: 'Люфт рулевой колонки и вилки',
    dialogue: 'День добрый! На кочках сильно бьет в руки, руль шатается вперед-назад. Нужно подтянуть или перебрать рулевой стакан с подшипниками.',
    requestedDetails: {
      issue: 'Устранение люфта рулевой колонки, протяжка узлов',
      budget: 'По прейскуранту СТО',
    },
  },

  // --- СВАП / ЗАМЕНА АККУМУЛЯТОРА (BATTERY_SWAP) ---
  {
    name: 'Алишер Мирзоев',
    avatar: '🔋',
    company: 'Самокат',
    phone: '+7 (926) 303-91-82',
    requestType: 'BATTERY_SWAP',
    title: 'Срочный свап разряженного аккумулятора (60V)',
    dialogue: 'Привет! Докатился до вас на педалях, батарея 60V 21Ah села на 2%. Поменяйте, пожалуйста, на полностью заряженную, у меня смена до полуночи!',
    requestedDetails: {
      item: 'Замена разряженного АКБ на 100% заряженный со склада',
      issue: 'Батарея разряжена',
    },
  },
  {
    name: 'Евгений Лазарев',
    avatar: '⚡',
    company: 'Яндекс Еда',
    phone: '+7 (910) 840-55-19',
    requestType: 'BATTERY_SWAP',
    title: 'Плановая замена АКБ по абонементу',
    dialogue: 'Здорово! Я по суточному тарифу со свапом батарей. Сдаю разряженную на зарядку, забираю готовую зеленую.',
    requestedDetails: {
      item: 'Свап аккумулятора (60V / 48V)',
    },
  },

  // --- ВОЗВРАТ БАЙКА / ЗАВЕРШЕНИЕ (RETURN) ---
  {
    name: 'Денис Мельников',
    avatar: '🏁',
    company: 'Купер',
    phone: '+7 (977) 890-12-34',
    requestType: 'RETURN',
    title: 'Возврат электробайка и закрытие договора',
    dialogue: 'Здравствуйте! Две недели аренды подошли к концу, уезжаю на сессию. Байк помыл, аккумулятор заряжен, тормоза работают. Принимайте байк и верните залог, пожалуйста.',
    requestedDetails: {
      item: 'Возврат арендованного байка, осмотр на повреждения, расчет залога',
      duration: 'Закрытие аренды',
    },
  },
];

let lastScenarioIndex = -1;

export function getRandomClient(gameTime: string): SimulatedClient {
  let nextIdx: number;
  do {
    nextIdx = Math.floor(Math.random() * CLIENT_TEMPLATES.length);
  } while (nextIdx === lastScenarioIndex && CLIENT_TEMPLATES.length > 1);

  lastScenarioIndex = nextIdx;
  const tpl = CLIENT_TEMPLATES[nextIdx];

  return {
    id: `sim-cli-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name: tpl.name,
    avatar: tpl.avatar,
    company: tpl.company,
    phone: tpl.phone,
    requestType: tpl.requestType,
    title: tpl.title,
    dialogue: tpl.dialogue,
    requestedDetails: { ...tpl.requestedDetails },
    status: 'WAITING',
    createdAtGameTime: gameTime,
    createdAtRealTime: Date.now(),
  };
}
