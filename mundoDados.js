// Conteúdo fixo do Mundo (Sidepoint): Katalão e a cidade de Frontier.
// Gerado a partir do guia de Frontier. Cada texto tem uma versão pública
// (`pub`) e, quando difere, uma do mestre (`gm`): o modo Jogador mostra só
// `pub`; o modo GM mostra `gm` quando existir (ver textoVisivel em mundo.js).
// Para atualizar o conteúdo, edite aqui (ou peça ao Claude).

export const KATALAO_INFO = {
 "id": "katalao",
 "mapa": "mundo/katalao-mapa.jpg",
 "imagem": "mundo/katalao-cidade.jpg",
 "mapaLegenda": "Frontier fica no nordeste, colada em Hoshon (Maxis). Ao sul ficam Atlarin, Atlas (a casa dos Pendragons) e Pompeia.",
 "visaoGeral": {
  "pub": "<p>Reino de arquitetura medieval europeia, agrário, feudal e steampunk (ferro, aço e vapor, com a mana como fonte de energia). Linhagem, sangue e tradição valem acima de tudo: cada cidade tem um lorde definido por laços de sangue, de casas milenares que refinaram seus poderes por gerações.</p><ul><li><b>A coroa:</b> a linhagem Thulin, os Descendentes de MERC. O rei atual é jovem, recém-casado e ainda sem herdeiro.</li><li><b>As casas:</b> seis grandes casas dividem o reino por função e dom de sangue; abaixo delas, casas vassalas como os Brennard (dos Pendragons) e os Flumifogo (dos Magnum).</li><li><b>O exército:</b> organizado de forma feudal.</li><li><b>O inimigo:</b> Suth, com guerras constantes.</li><li><b>A moeda:</b> karphel.</li></ul>"
 },
 "etiquetas": [
  {
   "metal": "Adamantina, roxa",
   "cor": "#7A4BB5",
   "texto": "As casas mais altas: a coroa Thulin e as seis grandes casas."
  },
  {
   "metal": "Ouro",
   "cor": "#E0B83A",
   "texto": "Nobres. Todos têm singularidade. Ex.: Brennard, Flumifogo."
  },
  {
   "metal": "Prata",
   "cor": "#B9C0C5",
   "texto": "Casas bem estabelecidas e sólidas."
  },
  {
   "metal": "Bronze",
   "cor": "#9A5F2E",
   "texto": "Boas casas de serventes, pequenos prestadores, mão de obra qualificada com história de bons trabalhadores."
  },
  {
   "metal": "Latão",
   "cor": "#C8A951",
   "texto": "O nível mais baixo: serventes e casas servas. É onde começam as famílias do Cadastro Brennard."
  }
 ],
 "marcas": [
  [
   "▼ sob o brasão",
   "Etiqueta de ouro de um nobre que nasceu sem singularidade."
  ],
  [
   "Linha embaixo",
   "Em qualquer metal: bastardo ou não legitimado."
  ]
 ],
 "casas": [
  {
   "id": "thulin",
   "nome": "Família real Thulin",
   "papel": "Kingsyard, a capital",
   "tag": "Coroa",
   "pub": "<p>A linhagem real, registrada como <b>Descendentes de MERC</b>.</p><ul><li><b>Nefarius Mercos Thulin</b>, o rei antigo (falecido).</li><li><b>Kranos Thulin</b>, filho de Nefarius, casado com <b>Karphel</b>. 'A partir de Kranos, se uniram à Imperadora Deusa Karphel.'</li><li>O rei atual é jovem, recém-casado e ainda sem herdeiro.</li></ul>",
   "gm": "<p>A linhagem real, registrada como <b>Descendentes de MERC</b>.</p><ul><li><b>Nefarius Mercos Thulin</b>, o rei antigo (falecido).</li><li><b>Kranos Thulin</b>, filho de Nefarius, casado com <b>Karphel</b>. 'A partir de Kranos, se uniram à Imperadora Deusa Karphel.'</li><li>O rei atual é jovem, recém-casado e sem herdeiro. Confirmar se é o Kranos.</li></ul>"
  },
  {
   "id": "sehen",
   "nome": "Clã Sehen",
   "papel": "Cabeça: Baltazar Sehen · Kingsyard",
   "tag": "Dulahand",
   "pub": "<p>Guardiões da capital e da família real, inquisidores pela nobreza. Devotos de <b>Dulahand</b>.</p><p><b>Dom de sangue:</b> grande sorte natural; podem ter grande regeneração física.</p><ul><li><b>Baltazar Sehen</b> (cabeça): regeneração e manipulação da própria sorte.</li></ul>",
   "gm": "<p>Guardiões da capital e da família real, inquisidores pela nobreza. Devotos de <b>Dulahand</b>.</p><p><b>Dom de sangue:</b> grande sorte natural; podem ter grande regeneração física.</p><ul><li><b>Baltazar Sehen</b> (cabeça): regeneração e manipulação da própria sorte.</li></ul><p><b>Gancho:</b> se alguém carregar um pedaço do próprio Dulahand, os Sehen vão notar.</p>",
   "singularity": { "type": "Corpo", "main": "Regeneração" }
  },
  {
   "id": "pendragon",
   "nome": "Clã Pendragon",
   "papel": "Cabeça: Wyver Pendragon · Atlas",
   "tag": "Gigas",
   "img": "mundo/retratos/lenvi.jpg",
   "pub": "<p>Equilíbrio entre impulso e ordem, <b>tecnologia de mana</b>, conexão com o plano Éter. Devotos de <b>Gigas</b>, como os dragões (daí o pacto com o Rubrasol).</p><p><b>Dom e maldição:</b> sangue com tanta mana que causa instabilidade mental.</p><ul><li><b>Wyver Pendragon</b> (cabeça).</li><li><b>Lenvi Pendragon</b>, filha de Wyver: reserva de mana; usa um equipamento que controla emoções; rancorosa; não gosta de ser desprezada nem de pessoas.</li><li><b>Van Pendragon</b>, filho de Wyver.</li><li><b>Volaria Pendragon</b>, filha de Lenvi.</li><li><b>Sir Flynn Mason</b>, cavaleiro da Guarda Pendragon.</li></ul>",
   "gm": "<p>Equilíbrio entre impulso e ordem, <b>tecnologia de mana</b>, conexão com o plano Éter. Devotos de <b>Gigas</b>, como os dragões (daí o pacto com o Rubrasol).</p><p><b>Dom e maldição:</b> sangue com tanta mana que causa instabilidade mental.</p><ul><li><b>Wyver Pendragon</b> (cabeça). Provavelmente o lorde de cabelo azul que atacou Midhab.</li><li><b>Lenvi Pendragon</b>, filha de Wyver: reserva de mana; usa um equipamento que controla emoções; rancorosa; não gosta de ser desprezada nem de pessoas. Inspirada na GLaDOS.</li><li><b>Van Pendragon</b>, filho de Wyver. Sugestão para quem se tranca na Torre.</li><li><b>Volaria Pendragon</b>, filha de Lenvi.</li><li><b>Sir Flynn Mason</b>, cavaleiro da Guarda Pendragon.</li></ul><p><b>Gancho:</b> a mana azul do sangue é a mesma cor do cabelo. O dragão do brasão pode ser o Rubrasol ou um parente dele.</p>",
   "singularity": { "type": "Mana", "main": "Excesso de mana" }
  },
  {
   "id": "duran",
   "nome": "Clã Duran",
   "papel": "Cabeça: Yama Duran · Mundis",
   "tag": "Militar",
   "pub": "<p>Cavaleiros nobres, protetores do reino, a grande força militar de Katalão.</p><p><b>Dom de sangue:</b> armazenar energia com a mão esquerda e liberar com a direita.</p><ul><li><b>Yama Duran</b> (cabeça), filha de Vreston: energética e nobre, sem filtro e de bom coração; gosta de se mostrar; não gosta de injustiça.</li><li><b>Vreston Duran</b>: bastante elitista. Cavaleiro de Omem.</li><li><b>Darius Duran</b>: o coronel possuído por Belzebu, desaparecido na árvore.</li></ul>",
   "gm": "<p>Cavaleiros nobres, protetores do reino, a grande força militar de Katalão.</p><p><b>Dom de sangue:</b> armazenar energia com a mão esquerda e liberar com a direita.</p><ul><li><b>Yama Duran</b> (cabeça), filha de Vreston: energética e nobre, sem filtro e de bom coração; gosta de se mostrar; não gosta de injustiça.</li><li><b>Vreston Duran</b>: bastante elitista. Cavaleiro de Omem.</li><li><b>Darius Duran</b>: o coronel possuído por Belzebu, desaparecido na árvore.</li></ul><p><b>Gancho:</b> os Duran têm motivo pra odiar quem fez o coronel Darius desaparecer.</p>",
   "singularity": { "type": "Absorção e liberação", "main": "Absorver força e liberar energia" }
  },
  {
   "id": "ace",
   "nome": "Clã Ace",
   "papel": "Cabeça: vago · Promet",
   "tag": "Nekron",
   "pub": "<p>Experiências com os mortos e tecnologia de alma. Devotos de <b>Nekron</b>, com conexão com o plano astral.</p><p><b>Dom de sangue:</b> grande quantidade de alma; alguns veem o mundo de forma distorcida.</p><ul><li><b>Valefor Ace</b>: arquimaga da alma, ressonância de alma. Falecida em Steampoint.</li><li><b>Vashi Spades Ace</b>, filha de Valefor.</li></ul>",
   "gm": "<p>Experiências com os mortos e tecnologia de alma. Devotos de <b>Nekron</b>, com conexão com o plano astral.</p><p><b>Dom de sangue:</b> grande quantidade de alma; alguns veem o mundo de forma distorcida.</p><ul><li><b>Valefor Ace</b>: arquimaga da alma, ressonância de alma. Falecida em Steampoint.</li><li><b>Vashi Spades Ace</b>, filha de Valefor.</li></ul><p><b>Gancho:</b> a chefia está vaga desde a morte de Valefor Ace. O Rio Parado de Frontier é um problema de alma.</p>",
   "singularity": { "type": "Alma", "main": "Enxergar o Astra" }
  },
  {
   "id": "magnum",
   "nome": "Clã Magnum",
   "papel": "Cabeça: Mozan Magnum",
   "tag": "Caça",
   "pub": "<p>Inquisidores fora do reino, forças de exploração e invasão, caçadores e batedores.</p><ul><li><b>Mozan Magnum</b> (cabeça)</li></ul>",
   "gm": "<p>Inquisidores fora do reino, forças de exploração e invasão, caçadores e batedores.</p><ul><li><b>Mozan Magnum</b> (cabeça): a <b>Caçadora Escarlate</b>, que caça fora do reino.</li></ul><p><b>Gancho:</b> o motivo de a casa ter mudado de aparência ao longo das gerações (cabelo vermelho, hoje loiro) ainda está em aberto.</p>",
   "singularity": { "type": "Projeção física", "main": "Teleporte" }
  },
  {
   "id": "flumifogo",
   "nome": "Família Flumifogo",
   "papel": "Vassala dos Magnum · estradas do norte",
   "tag": "Estradas",
   "pub": "<p>Casa menor, vassala do clã <b>Magnum</b>. Por obrigação de vassalagem, guarda e patrulha as estradas de toda a <b>região norte</b> de Katalão.</p><p><b>Dom de sangue:</b> criar e manipular <b>fumaça quente</b>, como a de um vulcão: cortinas que cegam, nuvens que queimam e sufocam.</p><ul><li><b>Sir Vasco Flumifogo</b>: patrulheiro do norte, hoje reforçando a patrulha de Frontier por causa da onda de ningens. Sem paciência com pobres e sem-chapa, odeia o serviço, mas é competente e um guerreiro formidável. <button class='term' data-person='vasco'>Ver ficha</button></li></ul>",
   "gm": "<p>Casa menor, vassala do clã <b>Magnum</b>. Por obrigação de vassalagem, guarda e patrulha as estradas de toda a <b>região norte</b> de Katalão.</p><p><b>Dom de sangue:</b> criar e manipular <b>fumaça quente</b>, como a de um vulcão: cortinas que cegam, nuvens que queimam e sufocam.</p><ul><li><b>Sir Vasco Flumifogo</b>: patrulheiro do norte, hoje reforçando a patrulha de Frontier por causa da onda de ningens. Sem paciência com pobres e sem-chapa, odeia o serviço, mas é competente e um guerreiro formidável. <button class='term' data-person='vasco'>Ver ficha</button></li></ul><p><b>Gancho:</b> como vassalos dos Magnum, os olhos da Caçadora Escarlate na estrada.</p>"
  },
  {
   "id": "gotis",
   "nome": "Clã Gotis",
   "papel": "Cabeça: Iris Gotis · Pompeia",
   "tag": "Diplomacia",
   "pub": "<p>Gestão interna da nobreza, diplomatas, pesquisadores de relíquias.</p><p><b>Dom de sangue:</b> projeção de mana — ilusão.</p><ul><li><b>Iris Gotis</b> (cabeça).</li></ul>",
   "gm": "<p>Gestão interna da nobreza, diplomatas, pesquisadores de relíquias.</p><p><b>Dom de sangue:</b> projeção de mana — ilusão.</p><ul><li><b>Iris Gotis</b> (cabeça).</li></ul><p><b>Gancho:</b> Pompeia é o destino final da rota do Sidepoint.</p>",
   "singularity": { "type": "Projeção de mana", "main": "Ilusão" }
  },
  {
   "id": "brennard",
   "nome": "Casa Brennard",
   "papel": "Lorde: Otto Brennard · Frontier",
   "tag": "Vassala",
   "pub": "<p>Casa menor, vassala dos <b>Pendragons</b>. Rege <b>Frontier</b> e criou o <button class='term' data-term='cadastro'>Cadastro Brennard</button>.</p><ul><li><b>Lorde Otto Brennard</b> <button class='term' data-person='otto'>Ver ficha</button></li><li><b>Lady Isolde Brennard</b>, herdeira <button class='term' data-person='isolde'>Ver ficha</button></li></ul>",
   "gm": "<p>Casa menor, vassala dos <b>Pendragons</b>. Rege <b>Frontier</b> e criou o <button class='term' data-term='cadastro'>Cadastro Brennard</button>.</p><ul><li><b>Lorde Otto Brennard</b> <button class='term' data-person='otto'>Ver ficha</button></li><li><b>Lady Isolde Brennard</b>, herdeira <button class='term' data-person='isolde'>Ver ficha</button></li></ul><p><b>Gancho:</b> Otto quer um dia ser um lorde do tamanho dos Pendragons, e esconde isso dos relatórios que manda a Atlas.</p>"
  },
  {
   "id": "vinland",
   "nome": "Casa Vinland",
   "papel": "Vassala dos Brennard · chefia a definir",
   "tag": "Vassala",
   "pub": "<p>Casa menor, vassala dos <b>Brennard</b>. Pela cadeia de vassalagem, responde aos Brennard e, acima deles, aos Pendragons.</p>",
   "gm": "<p>Casa menor, vassala dos <b>Brennard</b>. Pela cadeia de vassalagem, responde aos Brennard e, acima deles, aos Pendragons.</p><p><b>Gancho:</b> casa nova no registro — faltam chefia, cidade, etiqueta e dom de sangue.</p>"
  },
  {
   "id": "ishran",
   "nome": "Casa Ishran",
   "papel": "Vassala dos Vinland · chefia a definir",
   "tag": "Vassala",
   "pub": "<p>Casa menor, vassala dos <b>Vinland</b>. É o degrau mais baixo da cadeia de vassalagem Pendragon → Brennard → Vinland → Ishran.</p>",
   "gm": "<p>Casa menor, vassala dos <b>Vinland</b>. É o degrau mais baixo da cadeia de vassalagem Pendragon → Brennard → Vinland → Ishran.</p><p><b>Gancho:</b> casa nova no registro — faltam chefia, cidade, etiqueta e dom de sangue.</p>"
  }
 ]
};

export const FRONTIER = {
 "id": "frontier",
 "nome": "Frontier",
 "reino": "katalao",
 "subtitulo": "A cidade sem lugar para quem chega",
 "ficha": [
  [
   "Onde",
   "Nordeste de Katalão, colada em Hoshon (Maxis)"
  ],
  [
   "Entrada",
   "Pelos entrepostos do condado, depois o portão leste (3 h de estrada)"
  ],
  [
   "Casa regente",
   "Casa Brennard, vassala dos Pendragons"
  ],
  [
   "Lorde",
   "Otto Brennard · herdeira: Lady Isolde"
  ],
  [
   "Cabeça militar",
   "Comandante Hildegard Valk"
  ],
  [
   "Guarda Pendragon",
   "Sir Flynn Mason"
  ],
  [
   "Protetor",
   "Rubrasol, o dragão"
  ],
  [
   "Estradas",
   "Sir Vasco Flumifogo (Magnum) e os Corredores de Trevas"
  ],
  [
   "Trabalho",
   {
    "pub": "Contratos de Colheita Grimm & Filhos",
    "gm": "A Balança (Aurélio Grimm), crime disfarçado de agência"
   }
  ],
  [
   "Economia",
   "Cevada, cerveja, gado; agricultura a vapor · moeda: karphel"
  ],
  [
   "Problema",
   "Gente demais chegando, campos fracos e o inverno vindo"
  ]
 ],
 "conceito": {
  "pub": "<p><button data-term='katalao'>Katalão</button> é feudal, medieval e steampunk: cada cidade tem um lorde por sangue, cada pessoa nasce com um papel e carrega no pescoço a <button data-term='chapa'>etiqueta de metal</button> com nome, sobrenome e brasão da casa. O metal diz quanto a casa vale. Os refugiados ningens que chegam de Maxis não têm etiqueta. Pela lei, não existem.</p><p>Frontier não é cruel. Ela só não tinha uma palavra para essa gente, e tem medo do dia em que os <button data-term='pendragons'>Pendragons</button> decidirem resolver por ela. O Lorde Otto respondeu com o <button data-term='cadastro'>Cadastro Brennard</button>: entrepostos que registram todo mundo na estrada, cabaninhas que dão nome e trabalho no mercado e uma parte nova da cidade sendo erguida para eles.</p>"
 },
 "chegada": [
  [
   "As torres na estrada",
   "Muito antes de Frontier, torres de vigia de pedra e ferro aparecem ao longo de todas as estradas e no meio dos campos abertos, uma à vista da outra. Tropas a cavalo e a vapor se aproximam de todo mundo que chega, pedem nome, origem e destino."
  ],
  [
   "Os campos sem força",
   "Quilômetros e quilômetros de plantação de cevada de cada lado da estrada, ainda crescendo, mas fracos, ralos, de um verde pálido. Colheitadeiras a vapor do tamanho de casas atravessam os campos devagar, soltando fumaça."
  ],
  [
   "O entreposto",
   "A alfândega do condado: um posto fortificado com guaritas, balanças, escrivães e filas. Todo mundo que entra é registrado, e os ningens são cadastrados ali mesmo. Em volta, um acampamento de lona: o Barro, de quem foi recusado ou ainda espera a vez."
  ],
  [
   "A etiqueta provisória",
   "Quem já tem etiqueta tem o nome anotado e segue. Os ningens sem etiqueta são cadastrados e saem com uma etiqueta de latão provisória, sem brasão de casa: \"O nome de família você recebe em Frontier. Até lá, isto é quem você é.\""
  ],
  [
   "Três horas de estrada",
   "Mais torres, mais campos, a patrulha das estradas passando. A fumaça das caldeiras de Frontier aparece no horizonte muito antes da muralha."
  ],
  [
   "A muralha leste",
   "Portão de pedra antiga, guardas e o leitor de etiquetas. Cada etiqueta é encaixada, a máquina clica e toca a campainha. Só entra quem tem a sua."
  ],
  [
   "O mercado e as cabaninhas",
   "O portão leste dá direto no Bairro do Bronze, o mercado. Entre as bancas, cabaninhas de madeira recebem os recém-chegados: escrivães de avental anotam ofícios, distribuem nomes de família e apontam onde tem trabalho e onde começar a vida, na parte nova da cidade que está sendo construída."
  ],
  [
   "Dentro da muralha",
   "Feira, sinos, cheiro de pão. Ao fundo, no centro, o solar. Todo mundo educado, e todo mundo de olho em quem tem etiqueta nova no pescoço."
  ]
 ],
 "estetica": [
  "Aldeia europeia antiga com máquinas a vapor: enxaimel, ardósia, moinhos com engrenagens de latão, catedral gótica pequena com lampiões a gás.",
  "Colheitadeiras a vapor do tamanho de casas atravessando quilômetros de cevada.",
  "Lavradores com próteses de latão: braço-foice, perna de mola.",
  "Arauto com megafone de latão lendo os editos.",
  "Brasão Brennard em ferro fundido; acima, maior e mais novo, o dragão vermelho e dourado dos Pendragons.",
  "Dirigíveis de carga no céu limpo; do lado de Maxis, fumaça negra.",
  "Torres de vigia de pedra e ferro ao longo das estradas e dos campos, uma à vista da outra."
 ],
 "medos": [
  {
   "pub": "<b>De dentro:</b> o celeiro não dá para os dois lados no inverno."
  },
  {
   "pub": "<b>De fora:</b> os ningens temem o frio, os cavaleiros e os Pendragons."
  },
  {
   "pub": "<b>De todos:</b> uma chacina como a de Midhab."
  },
  {
   "pub": "<b>O que todos sabem:</b> há 5 anos quase nenhum humano nasce, mas os ningens continuam nascendo. <button data-term='berços'>Os berços vazios.</button>",
   "gm": "<b>O que ninguém diz:</b> há 5 anos quase nenhum humano nasce, mas os ningens continuam nascendo. <button data-term='berços'>Os berços de Frontier estão vazios.</button>"
  },
  {
   "gm": "<b>O que a corte esconde:</b> o lorde e os nobres não sentem mais o gosto da comida, e os servos humanos andam exaustos e sem vontade de viver. <button data-term='semsal'>O mal sem sal.</button>"
  },
  {
   "pub": "<b>O que ninguém entende:</b> o <button data-term='rio'>Rio Parado</button>."
  }
 ],
 "forcas": [
  {
   "titulo": "Os entrepostos e as torres",
   "rotulo": "Fiscalização",
   "npc": "frontier_oruvel",
   "pub": "Postos fortificados na estrada de Maxis, a três horas da muralha, e torres de vigia ao longo de todas as estradas e campos. Registram todo mundo que entra no condado e cadastram os ningens."
  },
  {
   "titulo": "A Linha dos Fortins",
   "rotulo": "Cabeça militar",
   "npc": "frontier_valk",
   "pub": "Fortes de pedra e ferro ao longo da fronteira, ligados por telégrafo e pelo trem blindado Mula. Frontier não é militar, mas é por causa deles que Maxis nunca atravessou."
  },
  {
   "titulo": "Rubrasol, o Vigia dos Campos",
   "rotulo": "Protetor",
   "npc": "frontier_rubrasol",
   "pub": "Dragão vermelho e dourado que sobrevoa a região. As crianças acenam para a sombra dele sobre a cevada. Pacto antigo com os Pendragons e <button data-term='tributo'>tributo de gado</button> atrasado."
  },
  {
   "titulo": "Os Corredores de Trevas",
   "rotulo": "Estradas",
   "npc": "frontier_corvo",
   "pub": "Motociclistas da cidade central que seguem o Trevas. Motos a vapor, sobretudos, chapéus que nunca tiram, sempre com névoa ou chuva fina. Escoltam carroças, caçam bandidos e às vezes levam ningens embora."
  },
  {
   "titulo": "A Patrulha Flumifogo",
   "rotulo": "Estradas, com etiqueta",
   "npc": "frontier_vasco",
   "pub": "A casa Flumifogo, vassala dos Magnum, patrulha as estradas do norte. Sir Vasco veio reforçar Frontier por causa dos ningens: exige etiquetas e não tem paciência com quem não tem nenhuma. Onde ele luta, sobe fumaça de vulcão."
  },
  {
   "titulo": {
    "pub": "Contratos de Colheita Grimm & Filhos",
    "gm": "A Balança"
   },
   "rotulo": {
    "pub": "Trabalho",
    "gm": "Crime"
   },
   "npc": "frontier_grimm",
   "pub": "Agência de trabalho com escritório bonito na esquina dos armazéns. Arruma serviço nas fazendas para os ningens e empresta comida no inverno, a pagar em trabalho.",
   "gm": "Fachada: Contratos de Colheita Grimm & Filhos. Vende etiquetas de latão falsas que passam no leitor, prende ningens em dívidas e compra os grãos desviados pelo Oruvel. Hoje é quem dá comida ao Barro."
  }
 ],
 "mapaSvg": "<svg viewBox=\"0 0 900 880\" role=\"img\" aria-label=\"Mapa de Frontier por distritos. Norte em cima: campos do norte, a Vila Nova dentro da muralha nova, o Rio Parado, o Arrabalde e a cidade murada com o Distrito do Lorde no centro. Quem chega vem pelo leste, dos entrepostos, e entra pelo portão leste no mercado.\">\n          <rect x=\"0\" y=\"0\" width=\"900\" height=\"880\" fill=\"var(--field)\" opacity=\".45\"/>\n          <g class=\"region\" tabindex=\"0\" data-region=\"campos\"><path class=\"shape\" d=\"M8 120 H92 V808 H808 V120 H892 V872 H8 Z\" fill=\"var(--field)\" stroke=\"var(--line)\"/><text x=\"50\" y=\"470\" text-anchor=\"middle\" font-family=\"IBM Plex Mono, monospace\" font-size=\"13\" fill=\"var(--ink)\" transform=\"rotate(-90 50 470)\">CAMPOS DE CEVADA</text><text x=\"850\" y=\"350\" text-anchor=\"middle\" font-family=\"IBM Plex Mono, monospace\" font-size=\"13\" fill=\"var(--ink)\" transform=\"rotate(90 850 350)\">CAMPOS · TORRES DE VIGIA</text><text x=\"450\" y=\"845\" text-anchor=\"middle\" font-family=\"IBM Plex Mono, monospace\" font-size=\"13\" fill=\"var(--ink)\" >CAMPOS · estrada para Atlarin e Atlas ↓</text></g><g class=\"region\" tabindex=\"0\" data-region=\"barro\"><rect class=\"shape\" x=\"812\" y=\"586\" width=\"80\" height=\"150\" rx=\"6\" fill=\"var(--mud)\" stroke=\"var(--verd)\" stroke-dasharray=\"3 3\"/><text x=\"852\" y=\"612\" text-anchor=\"middle\" font-family=\"IBM Plex Mono, monospace\" font-size=\"10\" fill=\"var(--ink)\">ESTRADA</text><text x=\"852\" y=\"625\" text-anchor=\"middle\" font-family=\"IBM Plex Mono, monospace\" font-size=\"10\" fill=\"var(--ink)\">DE MAXIS</text><text x=\"852\" y=\"652\" text-anchor=\"middle\" font-family=\"Cinzel, serif\" font-size=\"12\" fill=\"var(--ink)\">Entrepostos</text><text x=\"852\" y=\"668\" text-anchor=\"middle\" font-family=\"Cinzel, serif\" font-size=\"12\" fill=\"var(--ink)\">e o Barro</text><text x=\"852\" y=\"692\" text-anchor=\"middle\" font-family=\"IBM Plex Mono, monospace\" font-size=\"10\" fill=\"var(--muted)\">3 h a leste</text><text x=\"852\" y=\"716\" text-anchor=\"middle\" font-family=\"IBM Plex Mono, monospace\" font-size=\"14\" fill=\"var(--ink)\">→</text></g><path d=\"M 796 549 L 852 549 L 852 586\" fill=\"none\" stroke=\"var(--muted)\" stroke-width=\"3\" stroke-dasharray=\"6 4\"/>\n          <text x=\"400\" y=\"14\" text-anchor=\"middle\" font-family=\"IBM Plex Mono, monospace\" font-size=\"11\" fill=\"var(--muted)\" >↑ Hoshon (Maxis)</text>\n          <g class=\"region\" tabindex=\"0\" data-region=\"camposnorte\"><rect class=\"shape\" x=\"110\" y=\"22\" width=\"580\" height=\"64\" rx=\"6\" fill=\"var(--field)\" stroke=\"var(--line)\"/><text x=\"400\" y=\"50\" text-anchor=\"middle\" font-family=\"Cinzel, serif\" font-size=\"17\" fill=\"var(--ink)\">Campos do norte</text><text x=\"400\" y=\"68\" text-anchor=\"middle\" font-family=\"IBM Plex Mono, monospace\" font-size=\"11\" fill=\"var(--muted)\">cevada fraca este ano · trabalho dos cadastrados</text></g>\n          <g class=\"region\" tabindex=\"0\" data-region=\"fortins\"><rect class=\"shape\" x=\"702\" y=\"22\" width=\"188\" height=\"66\" rx=\"6\" fill=\"var(--red-soft)\" stroke=\"var(--red)\" /><text x=\"796\" y=\"50\" text-anchor=\"middle\" font-family=\"Cinzel, serif\" font-size=\"16\" fill=\"var(--ink)\" >Fortins</text><text x=\"796\" y=\"68\" text-anchor=\"middle\" font-family=\"IBM Plex Mono, monospace\" font-size=\"11\" fill=\"var(--muted)\" >fronteira · Maxis</text></g>\n          <g class=\"region\" tabindex=\"0\" data-region=\"muralhanova\"><path class=\"shape\" d=\"M112 330 V112 Q112 100 124 100 H776 Q788 100 788 112 V330\" fill=\"none\" stroke=\"var(--brass)\" stroke-width=\"6\" stroke-dasharray=\"18 5\"/></g>\n          <rect x=\"405\" y=\"93\" width=\"90\" height=\"16\" fill=\"var(--bg)\" stroke=\"var(--muted)\"/><text x=\"450.0\" y=\"104.0\" text-anchor=\"middle\" font-family=\"IBM Plex Mono, monospace\" font-size=\"9\" fill=\"var(--ink)\" >PORTÃO NOVO</text>\n          <g class=\"region\" tabindex=\"0\" data-region=\"vilanova\"><rect class=\"shape\" x=\"126\" y=\"116\" width=\"648\" height=\"58\" rx=\"6\" fill=\"var(--verd-soft)\" stroke=\"var(--verd)\" /><text x=\"450\" y=\"140\" text-anchor=\"middle\" font-family=\"Cinzel, serif\" font-size=\"18\" fill=\"var(--ink)\" >Vila Nova Brennard</text><text x=\"450\" y=\"158\" text-anchor=\"middle\" font-family=\"IBM Plex Mono, monospace\" font-size=\"11\" fill=\"var(--muted)\" >casas das famílias do cadastro · latão · toque de recolher</text></g>\n          <g class=\"region\" tabindex=\"0\" data-region=\"rio\"><path class=\"shape\" d=\"M0 192 C 150 176, 300 214, 450 196 S 750 178, 900 194 L 900 220 C 750 204, 600 240, 450 222 S 150 202, 0 218 Z\" fill=\"var(--water)\" stroke=\"var(--verd)\"/><text x=\"220\" y=\"212\" text-anchor=\"middle\" font-family=\"IBM Plex Mono, monospace\" font-size=\"12\" fill=\"var(--ink)\" >RIO PARADO</text><text x=\"690\" y=\"210\" text-anchor=\"middle\" font-family=\"IBM Plex Mono, monospace\" font-size=\"12\" fill=\"var(--ink)\" >RIO PARADO</text></g>\n          <g class=\"region\" tabindex=\"0\" data-region=\"linha\"><rect class=\"shape\" x=\"420\" y=\"180\" width=\"60\" height=\"54\" rx=\"3\" fill=\"var(--bg)\" stroke=\"var(--red)\" stroke-width=\"2\" stroke-dasharray=\"5 3\"/><text x=\"450\" y=\"204\" text-anchor=\"middle\" font-family=\"IBM Plex Mono, monospace\" font-size=\"10\" fill=\"var(--red)\" >PONTE</text><text x=\"450\" y=\"217\" text-anchor=\"middle\" font-family=\"IBM Plex Mono, monospace\" font-size=\"10\" fill=\"var(--red)\" >ETIQUETA</text></g>\n          <g class=\"region\" tabindex=\"0\" data-region=\"arrabalde\"><rect class=\"shape\" x=\"126\" y=\"242\" width=\"648\" height=\"62\" rx=\"6\" fill=\"var(--paper)\" stroke=\"var(--line)\" /><text x=\"450\" y=\"266\" text-anchor=\"middle\" font-family=\"Cinzel, serif\" font-size=\"17\" fill=\"var(--ink)\" >Arrabalde do Rio</text><text x=\"450\" y=\"284\" text-anchor=\"middle\" font-family=\"IBM Plex Mono, monospace\" font-size=\"11\" fill=\"var(--muted)\" >residencial · latão · moinhos, curtumes e lavadeiras</text></g>\n          <rect x=\"112\" y=\"318\" width=\"676\" height=\"462\" rx=\"40\" fill=\"none\" stroke=\"var(--muted)\" stroke-width=\"7\" opacity=\".85\"/>\n          <rect x=\"425\" y=\"310\" width=\"50\" height=\"16\" fill=\"var(--bg)\" stroke=\"var(--muted)\"/><text x=\"450.0\" y=\"321.0\" text-anchor=\"middle\" font-family=\"IBM Plex Mono, monospace\" font-size=\"9\" fill=\"var(--ink)\" >PORTÃO</text>\n          <rect x=\"425\" y=\"772\" width=\"50\" height=\"16\" fill=\"var(--bg)\" stroke=\"var(--muted)\"/><text x=\"450.0\" y=\"783.0\" text-anchor=\"middle\" font-family=\"IBM Plex Mono, monospace\" font-size=\"9\" fill=\"var(--ink)\" >PORTÃO</text>\n          <rect x=\"104\" y=\"523\" width=\"16\" height=\"52\" fill=\"var(--bg)\" stroke=\"var(--muted)\"/><text x=\"112.0\" y=\"552.0\" text-anchor=\"middle\" font-family=\"IBM Plex Mono, monospace\" font-size=\"9\" fill=\"var(--ink)\" transform=\"rotate(-90 112.0 552.0)\">PORTÃO</text>\n          <rect x=\"780\" y=\"523\" width=\"16\" height=\"52\" fill=\"var(--bg)\" stroke=\"var(--muted)\"/><text x=\"788.0\" y=\"552.0\" text-anchor=\"middle\" font-family=\"IBM Plex Mono, monospace\" font-size=\"9\" fill=\"var(--ink)\" transform=\"rotate(-90 788.0 552.0)\">LESTE</text>\n          <g class=\"region\" tabindex=\"0\" data-region=\"colina\"><rect class=\"shape\" x=\"132\" y=\"336\" width=\"200\" height=\"104\" rx=\"6\" fill=\"var(--brass-soft)\" stroke=\"var(--brass)\" /><text x=\"232\" y=\"380\" text-anchor=\"middle\" font-family=\"Cinzel, serif\" font-size=\"16\" fill=\"var(--ink)\" >Colina de Prata</text><text x=\"232\" y=\"398\" text-anchor=\"middle\" font-family=\"IBM Plex Mono, monospace\" font-size=\"11\" fill=\"var(--muted)\" >residencial alto</text><text x=\"232\" y=\"414\" text-anchor=\"middle\" font-family=\"IBM Plex Mono, monospace\" font-size=\"11\" fill=\"var(--muted)\" >prata e ouro</text></g>\n          <g class=\"region\" tabindex=\"0\" data-region=\"praca\"><rect class=\"shape\" x=\"342\" y=\"336\" width=\"216\" height=\"104\" rx=\"6\" fill=\"var(--paper)\" stroke=\"var(--ink)\" /><text x=\"450\" y=\"376\" text-anchor=\"middle\" font-family=\"Cinzel, serif\" font-size=\"16\" fill=\"var(--ink)\" >Armazéns</text><text x=\"450\" y=\"394\" text-anchor=\"middle\" font-family=\"IBM Plex Mono, monospace\" font-size=\"11\" fill=\"var(--muted)\" >celeiros · silos · estoques</text></g>\n          <g class=\"region\" tabindex=\"0\" data-region=\"guarnicao\"><rect class=\"shape\" x=\"568\" y=\"336\" width=\"200\" height=\"104\" rx=\"6\" fill=\"var(--red-soft)\" stroke=\"var(--red)\" /><text x=\"668\" y=\"382\" text-anchor=\"middle\" font-family=\"Cinzel, serif\" font-size=\"16\" fill=\"var(--ink)\" >Guarnição</text><text x=\"668\" y=\"400\" text-anchor=\"middle\" font-family=\"IBM Plex Mono, monospace\" font-size=\"11\" fill=\"var(--muted)\" >quartel · necrotério</text></g>\n          <g class=\"region\" tabindex=\"0\" data-region=\"balanca\"><rect class=\"shape\" x=\"350\" y=\"410\" width=\"82\" height=\"24\" rx=\"3\" fill=\"var(--paper)\" stroke=\"var(--ink)\" stroke-dasharray=\"4 3\"/><text x=\"391\" y=\"426\" text-anchor=\"middle\" font-family=\"IBM Plex Mono, monospace\" font-size=\"10\" fill=\"var(--ink)\" >Grimm &amp; F.</text></g>\n          <g class=\"region\" tabindex=\"0\" data-region=\"torre\"><circle class=\"shape\" cx=\"770\" cy=\"314\" r=\"20\" fill=\"var(--paper)\" stroke=\"var(--red)\" stroke-width=\"2\"/><text x=\"770\" y=\"318\" text-anchor=\"middle\" font-family=\"IBM Plex Mono, monospace\" font-size=\"10\" fill=\"var(--red)\" >TORRE</text></g>\n          <g class=\"region\" tabindex=\"0\" data-region=\"claustro\"><rect class=\"shape\" x=\"132\" y=\"450\" width=\"160\" height=\"310\" rx=\"6\" fill=\"var(--verd-soft)\" stroke=\"var(--verd)\" /><text x=\"212\" y=\"595\" text-anchor=\"middle\" font-family=\"Cinzel, serif\" font-size=\"16\" fill=\"var(--ink)\" >Claustro</text><text x=\"212\" y=\"613\" text-anchor=\"middle\" font-family=\"IBM Plex Mono, monospace\" font-size=\"11\" fill=\"var(--muted)\" >catedral · templos</text><text x=\"212\" y=\"629\" text-anchor=\"middle\" font-family=\"IBM Plex Mono, monospace\" font-size=\"11\" fill=\"var(--muted)\" >mosteiros · cemitério</text></g>\n          <g class=\"region\" tabindex=\"0\" data-region=\"solar\"><rect class=\"shape\" x=\"302\" y=\"450\" width=\"296\" height=\"150\" rx=\"72\" fill=\"var(--brass-soft)\" stroke=\"var(--brass)\" stroke-width=\"2.5\"/><text x=\"450\" y=\"521\" text-anchor=\"middle\" font-family=\"Cinzel, serif\" font-size=\"19\" fill=\"var(--ink)\" >Distrito do Lorde</text><text x=\"450\" y=\"539\" text-anchor=\"middle\" font-family=\"IBM Plex Mono, monospace\" font-size=\"11\" fill=\"var(--muted)\" >solar · registro · tribunal</text></g>\n          <g class=\"region\" tabindex=\"0\" data-region=\"caldeiras\"><rect class=\"shape\" x=\"302\" y=\"610\" width=\"296\" height=\"150\" rx=\"6\" fill=\"var(--bg)\" stroke=\"var(--muted)\" /><text x=\"450\" y=\"679\" text-anchor=\"middle\" font-family=\"Cinzel, serif\" font-size=\"16\" fill=\"var(--ink)\" >Caldeiras</text><text x=\"450\" y=\"697\" text-anchor=\"middle\" font-family=\"IBM Plex Mono, monospace\" font-size=\"11\" fill=\"var(--muted)\" >forjas · cervejarias · estação do Mula</text></g>\n          <g class=\"region\" tabindex=\"0\" data-region=\"bronze\"><rect class=\"shape\" x=\"608\" y=\"450\" width=\"160\" height=\"310\" rx=\"6\" fill=\"var(--paper)\" stroke=\"var(--brass)\" /><text x=\"688\" y=\"587\" text-anchor=\"middle\" font-family=\"Cinzel, serif\" font-size=\"15\" fill=\"var(--ink)\" >Bairro do Bronze</text><text x=\"688\" y=\"605\" text-anchor=\"middle\" font-family=\"IBM Plex Mono, monospace\" font-size=\"11\" fill=\"var(--muted)\" >residencial · ofícios</text><text x=\"688\" y=\"621\" text-anchor=\"middle\" font-family=\"IBM Plex Mono, monospace\" font-size=\"11\" fill=\"var(--muted)\" >artesãos · feiras</text><text x=\"688\" y=\"637\" text-anchor=\"middle\" font-family=\"IBM Plex Mono, monospace\" font-size=\"11\" fill=\"var(--muted)\" >o mercado da cidade</text><text x=\"688\" y=\"653\" text-anchor=\"middle\" font-family=\"IBM Plex Mono, monospace\" font-size=\"11\" fill=\"var(--verd)\">cabaninhas de recepção</text></g>\n          <text x=\"880\" y=\"866\" font-family=\"IBM Plex Mono, monospace\" font-size=\"11\" fill=\"var(--muted)\" text-anchor=\"end\">N ↑</text>\n        </svg>",
 "distritos": {
  "campos": {
   "titulo": "Os campos de cevada",
   "pub": "<p>Quilômetros de cevada a oeste, a leste e ao sul, cortados por estradas com torres de vigia, uma à vista da outra. Colheitadeiras a vapor do tamanho de casas. Este ano a plantação cresce sem força: inverno cedo, solo cansado e gente demais.</p><ul><li><b>Portão leste:</b> estrada de Maxis, pelos entrepostos (3 h). É por onde todo mundo chega.</li><li><b>Portão oeste:</b> estrada dos peregrinos e das fazendas.</li><li><b>Portão sul:</b> estrada para Atlarin e Atlas.</li></ul>"
  },
  "barro": {
   "titulo": "Os entrepostos e o Barro",
   "pub": "<p>A <b>alfândega do condado</b>, a cerca de três horas a leste da muralha, na estrada de Maxis. Postos fortificados com guaritas, balanças e escrivães: todo mundo que entra é registrado, e os ningens são cadastrados ali e saem com uma <b>etiqueta de latão provisória</b>.</p><p>Em volta dos entrepostos cresceu um acampamento de lona: <b>o Barro</b>. Fica ali quem foi recusado ou ainda espera a vez. Lona de carga de Maxis com logos da Mason e da Revol, caldeiras viradas fogão, o altar à Isha. Líder: Ossa.</p>",
   "gm": "<p>A <b>alfândega do condado</b>, a cerca de três horas a leste da muralha, na estrada de Maxis. Postos fortificados com guaritas, balanças e escrivães: todo mundo que entra é registrado, e os ningens são cadastrados ali e saem com uma <b>etiqueta de latão provisória</b>.</p><p>Em volta dos entrepostos cresceu um acampamento de lona: <b>o Barro</b>, de quem foi recusado ou ainda espera a vez. Líder: Ossa. Voz radical: Faísca.</p><ul><li>A fila é onde a <b>Balança</b> trabalha: vende lugar na frente, etiquetas provisórias falsas e 'contratos de colheita' para quem desistiu de esperar.</li><li>As tropas dos entrepostos respondem ao Oruvel; a patrulha do Sir Vasco faz a ligação entre eles e a cidade.</li><li>Longe da muralha e dos olhos do lorde: se houver chacina, é aqui que ela acontece.</li></ul>"
  },
  "vilanova": {
   "titulo": "Vila Nova Brennard",
   "pub": "<p><b>Distrito dos novos ningens</b>, entre a muralha nova e o Rio Parado. Fileiras de casas iguais de madeira e pedra, das famílias do cadastro, cada porta com o brasão novo de uma família de latão sob o dos Brennard.</p><ul><li>Trabalho, ração e <b>toque de recolher</b>: o sino da noite fecha a Ponte da Etiqueta.</li><li>A maioria trabalha nos campos, nos armazéns e nas caldeiras.</li><li>Muitos têm parentes ainda esperando no Barro, nos entrepostos. Isso é o que mais pesa.</li></ul><p>É a <b>parte nova da cidade, ainda em construção</b>: andaimes, madeira fresca, ruas de terra. É para cá que as cabaninhas do mercado mandam os recém-chegados.</p>"
  },
  "muralhanova": {
   "titulo": "A muralha nova",
   "pub": "<p>Obra do Lorde Otto: pedra nova e ferro, ainda com andaimes em alguns trechos. Parte das duas pontas da muralha velha e fecha o Arrabalde, o rio e a Vila Nova, a parte da cidade que cresce para o norte.</p><p>O <b>Portão Novo</b>, ao norte, dá para os campos do norte, por onde os moradores da Vila Nova saem para trabalhar na colheita.</p>",
   "gm": "<p>Obra do Lorde Otto: pedra nova e ferro, ainda com andaimes em alguns trechos. Parte das duas pontas da muralha velha e fecha o Arrabalde, o rio e a Vila Nova.</p><ul><li>O <b>Portão Novo</b>, ao norte, dá para os campos do norte, por onde os cadastrados saem para trabalhar.</li><li>Para o lorde: proteger o investimento e mostrar aos Pendragons que a cidade cresce.</li><li>Os trechos de andaime são por onde a Balança passa coisas e gente de noite.</li></ul>"
  },
  "rio": {
   "titulo": "O Rio Parado",
   "pub": "<p>Corre de leste a oeste, dentro da muralha nova, separando a Vila Nova do Arrabalde. Desacelerou e não reflete mais nada. De noite, dizem, silhuetas atravessam para lugar nenhum.</p><p>A única travessia é a Ponte da Etiqueta.</p>",
   "gm": "<p>Corre de leste a oeste, agora <b>dentro da muralha nova</b>, separando a Vila Nova do Arrabalde. Desacelerou, não reflete mais nada, e de noite silhuetas atravessam para lugar nenhum.</p><p>Sem Dragoalma, os mortos da região não partem. É a pista da missão de Dragoalma e a ligação com o espírito do Sargento Aldric.</p><p>A única travessia é a Ponte da Etiqueta.</p>"
  },
  "linha": {
   "titulo": "A Ponte da Etiqueta",
   "pub": "<p>Ponte de pedra com guarita de ferro e um leitor de etiquetas em cada ponta. Cavaleiros de armadura a vapor vigiam dia e noite.</p><ul><li><b>Com latão do cadastro:</b> atravessa de manhã para trabalhar e volta antes do sino da noite.</li><li><b>Sem etiqueta:</b> não atravessa.</li><li>Alguns guardas deixam passar etiquetas de lata em troca de alguma coisa.</li></ul><p>Os ningens esperam ali, dia após dia, uma chance de trabalho.</p>"
  },
  "arrabalde": {
   "titulo": "Arrabalde do Rio",
   "pub": "<p><b>Residencial periférico</b>, entre o rio e a muralha. Humanos pobres de etiqueta de latão: moleiros, lavadeiras, curtidores, barqueiros.</p><ul><li><b>O moinho da Berta</b>, com a roda d'água quase parada desde que o rio desacelerou.</li><li>Curtumes e varais. Cheiro de couro e de água sem correnteza.</li><li>São os vizinhos mais próximos do Barro e os que mais têm medo: perdem o trabalho para os cadastrados primeiro.</li></ul>"
  },
  "praca": {
   "titulo": "Distrito dos Armazéns",
   "pub": "<p>Logo depois do portão norte. A despensa de Frontier: <b>celeiros, silos, armazéns de grãos e de cerveja, depósitos de lenha e carvão</b>, pátios de carga e balanças públicas.</p><ul><li><b>O Celeiro Grande</b>, guardado pela guarda da cidade.</li><li>Na esquina, o escritório dos <b>Contratos de Colheita Grimm &amp; Filhos</b>.</li></ul>",
   "gm": "<p>Logo depois do portão norte. A despensa de Frontier: <b>celeiros, silos, armazéns de grãos e de cerveja, depósitos de lenha e carvão</b>, pátios de carga e balanças públicas.</p><ul><li><b>O Celeiro Grande</b>, palco da tarefa I. Do lado de dentro estão os números que o inverno vai cobrar.</li><li>Guardado pela guarda do Oruvel, que desvia grão daqui.</li><li><b>Contratos de Colheita Grimm &amp; Filhos</b> fica na esquina dos armazéns: compra o grão desviado.</li></ul>"
  },
  "balanca": {
   "titulo": "Contratos de Colheita Grimm & Filhos",
   "pub": "<p>Escritório bonito na esquina do Distrito dos Armazéns, placa de latão, recibos carimbados. Agência de trabalho para as fazendas e de empréstimos de comida.</p>",
   "gm": "<p>Escritório bonito na esquina do Distrito dos Armazéns, placa de latão, recibos carimbados. Fachada da Balança, e o lugar perfeito para receber grão desviado.</p><p>Nos fundos, uma prensa de etiquetas quase idêntica à oficial.</p>"
  },
  "colina": {
   "titulo": "Colina de Prata",
   "pub": "<p><b>Residencial alto</b>, no noroeste, em terreno mais elevado. Casas de pedra das famílias de prata e dos poucos ouros menores. Jardins, portões de ferro, criados de bronze.</p><p>Daqui sai a maior parte das reclamações contra o cadastro.</p>",
   "gm": "<p><b>Residencial alto</b>, no noroeste, em terreno mais elevado. Casas de pedra das famílias de prata e dos poucos ouros menores. Jardins, portões de ferro, criados de bronze.</p><p>É daqui que sai a pressão contra o cadastro: 'latão demais derruba o preço de tudo'. E é aqui que o mal sem sal mais aparece: banquetes que ninguém come.</p>"
  },
  "solar": {
   "titulo": "Distrito do Lorde",
   "pub": "<p>O centro da cidade e do poder.</p><ul><li><b>O Solar Brennard:</b> salões de pedra, retratos antigos, o brasão Brennard sob o dragão Pendragon.</li><li><b>O Registro de Papéis:</b> gavetas sem fim e a prensa oficial de etiquetas. Escrivão Hollan.</li><li><b>O tribunal</b> e a sala do cadastro, com fila de ningens desde a madrugada.</li></ul>",
   "gm": "<p>O centro da cidade e do poder.</p><ul><li><b>O Solar Brennard:</b> salões de pedra, retratos antigos, o brasão Brennard sob o dragão Pendragon. Onde os reféns ficariam, se houver reféns.</li><li><b>O Registro de Papéis:</b> gavetas sem fim e a prensa oficial de etiquetas. Escrivão Hollan.</li><li><b>O tribunal</b> e a sala do cadastro, com fila de ningens desde a madrugada.</li></ul>"
  },
  "guarnicao": {
   "titulo": "Guarnição",
   "pub": "<p>Nordeste da cidade, de frente para a ponte. Quartéis, estábulos, oficina das armaduras a vapor e o necrotério militar.</p><p>Aqui manda o Capitão Oruvel. A patrulha do Sir Vasco Flumifogo se aloja aqui e sai pelo portão leste para as estradas.</p>",
   "gm": "<p>Nordeste da cidade, de frente para a ponte. Quartéis, estábulos, oficina das armaduras a vapor e o necrotério militar, onde o corpo do Sargento Aldric segue preso à própria alma.</p><p>Aqui manda o Capitão Oruvel. A patrulha do Sir Vasco Flumifogo se aloja aqui, de má vontade, e sai pelo portão leste para as estradas.</p>"
  },
  "claustro": {
   "titulo": "Claustro de Dragoalma",
   "pub": "<p><b>Bairro religioso</b>, a oeste, junto ao portão oeste, por onde chegam os peregrinos.</p><ul><li><b>A catedral</b> de Dragoalma, com vitrais a gás e o sino de relógio. Irmã Veyla.</li><li><b>Templos menores</b> a outros deuses do reino (Gigas, Dulahand).</li><li><b>Mosteiros</b> e o convento, com hortas, copistas e enfermaria.</li><li><b>O cemitério</b>.</li></ul>",
   "gm": "<p><b>Bairro religioso</b>, a oeste, junto ao portão oeste, por onde chegam os peregrinos.</p><ul><li><b>A catedral</b> de Dragoalma, com vitrais a gás e o sino de relógio. Irmã Veyla.</li><li><b>Templos menores</b> a outros deuses do reino (Gigas, por respeito aos Pendragons; Dulahand, pelos Sehen).</li><li><b>Mosteiros</b> e o convento, com hortas, copistas e enfermaria.</li><li><b>O cemitério</b>, onde as orações de passagem não funcionam mais e as covas novas ficam frias de um jeito errado.</li></ul>"
  },
  "bronze": {
   "titulo": "Bairro do Bronze",
   "pub": "<p><b>Residencial, ofícios e o mercado da cidade</b>, no leste, logo depois do portão leste: é a primeira coisa que quem chega vê. Casas de enxaimel de famílias de bronze: ferreiros, mestres-cervejeiros, carpinteiros, tecelões, escrivães menores.</p><ul><li><b>As cabaninhas de recepção</b>, entre as bancas, logo depois do portão leste: escrivães anotam ofícios, distribuem os nomes de família do cadastro e mandam cada recém-chegado para um trabalho e para a parte nova da cidade.</li><li><b>A Praça da Feira</b>: feira semanal, bancas, leilão de gado e o patíbulo antigo.</li><li>A estalagem onde correm os boatos.</li></ul>",
   "gm": "<p><b>Residencial, ofícios e o mercado da cidade</b>, no leste, logo depois do portão leste: é a primeira coisa que quem chega vê. Casas de enxaimel de famílias de bronze: ferreiros, mestres-cervejeiros, carpinteiros, tecelões, escrivães menores.</p><ul><li><b>As cabaninhas de recepção</b>, entre as bancas, logo depois do portão leste: escrivães anotam ofícios, distribuem os nomes de família do cadastro e mandam cada recém-chegado para um trabalho e para a parte nova da cidade.</li><li><b>A Praça da Feira</b>: feira semanal, bancas, leilão de gado. O <b>patíbulo antigo</b> fica aqui, palco do julgamento.</li><li>A estalagem onde correm os boatos.</li><li>Gente que subiu do latão em gerações de trabalho e vê o cadastro com sentimento misturado: 'nós levamos cem anos para chegar aqui'.</li><li>As cabaninhas são onde o cadastro do Otto vira gente de verdade, e onde a Balança tenta passar na frente oferecendo \"trabalho melhor\".</li></ul>"
  },
  "caldeiras": {
   "titulo": "Distrito das Caldeiras",
   "pub": "<p>Sul da cidade, entre o Distrito do Lorde e o portão sul. Forjas, oficinas de tratores a vapor, as cervejarias de Frontier e a <b>estação do Mula</b>, o trem blindado que liga a cidade à Linha dos Fortins.</p><p>Fumaça o dia inteiro. É onde mais se emprega cadastrado.</p>",
   "gm": "<p>Sul da cidade, entre o Distrito do Lorde e o portão sul. Forjas, oficinas de tratores a vapor, as cervejarias de Frontier e a <b>estação do Mula</b>, o trem blindado que liga a cidade à Linha dos Fortins.</p><p>Fumaça o dia inteiro. É onde mais se emprega cadastrado, e onde a Balança recruta.</p>"
  },
  "torre": {
   "titulo": "Torre de Vigia",
   "pub": "<p>Torre da muralha no canto nordeste, de onde se vê o Barro inteiro e a estrada de Maxis.</p>",
   "gm": "<p>Torre da muralha no canto nordeste, de onde se vê o Barro inteiro e a estrada de Maxis. Palco possível da tarefa III. Quem se trancou lá depende de quem entregou as tarefas. Sugestão: Van Pendragon, filho de Wyver, cedendo à maldição.</p>"
  },
  "fortins": {
   "titulo": "A Linha dos Fortins",
   "pub": "<p>Fortes pequenos de pedra e ferro ao longo da fronteira com Maxis, a nordeste, ligados por telégrafo e pelo trem blindado a vapor Mula. Comandante Hildegard Valk.</p>",
   "gm": "<p>Fortes pequenos de pedra e ferro ao longo da fronteira com Maxis, a nordeste, ligados por telégrafo e pelo trem blindado a vapor Mula. Comandante Hildegard Valk.</p><p>Um deles parou de responder.</p>"
  },
  "camposnorte": {
   "titulo": "Os campos do norte",
   "pub": "<p>Cevada a perder de vista entre a muralha nova e Hoshon, em Maxis. Os moradores da Vila Nova trabalham aqui na colheita, saindo pelo Portão Novo de manhã e voltando antes do sino.</p><p>A plantação está fraca este ano: o inverno chega cedo, o solo está cansado e há gente demais tirando dela.</p>"
  }
 },
 "termos": {
  "chapa": {
   "titulo": "A etiqueta (a \"chapa\")",
   "pub": "<p>Etiqueta de identificação de metal, usada no pescoço. Traz <b>nome, sobrenome e o brasão da casa</b>. O metal mostra a importância da casa:</p><ul><li><b>Latão:</b> serventes e casas servas.</li><li><b>Bronze:</b> boas casas de serventes, pequenos prestadores, mão de obra qualificada com história.</li><li><b>Prata:</b> casas bem estabelecidas e sólidas.</li><li><b>Ouro:</b> nobres, todos com singularidade.</li><li><b>Adamantina (roxa):</b> as casas mais altas.</li></ul><p><b>Marcas:</b> triângulo para baixo sob o brasão = nobre nascido sem singularidade. Linha embaixo da etiqueta = bastardo ou não legitimado.</p><p>Nos portões, o leitor lê as perfurações da etiqueta e toca uma <b>campainha limpa</b> (passa), <b>range e trava</b> (inválida) ou fica <b>mudo</b> (sem etiqueta). No Barro circulam etiquetas de lata de comida, que o leitor recusa.</p>",
   "gm": "<p>Etiqueta de identificação de metal, usada no pescoço como uma dog tag. Traz <b>nome, sobrenome e o brasão da casa</b>. O metal mostra a importância da casa:</p><ul><li><b>Latão:</b> serventes e casas servas.</li><li><b>Bronze:</b> boas casas de serventes, pequenos prestadores, mão de obra qualificada com história.</li><li><b>Prata:</b> casas bem estabelecidas e sólidas.</li><li><b>Ouro:</b> nobres, todos com singularidade.</li><li><b>Adamantina (roxa):</b> as casas mais altas.</li></ul><p><b>Marcas:</b> triângulo para baixo sob o brasão = nobre nascido sem singularidade. Linha embaixo da etiqueta = bastardo ou não legitimado.</p><p>Nos portões, o leitor lê as perfurações da etiqueta e toca uma <b>campainha limpa</b> (passa), <b>range e trava</b> (inválida) ou fica <b>mudo</b> (sem etiqueta). No Barro circulam etiquetas de lata de comida; as da Balança imitam latão bem o bastante para tocar a campainha.</p>"
  },
  "katalao": {
   "titulo": "Katalão",
   "pub": "<p>Reino de arquitetura medieval europeia, feudal e steampunk. Linhagem, sangue e tradição acima de tudo: cada cidade tem um lorde definido por laços de sangue, de casas milenares.</p><ul><li><b>O rei:</b> jovem, recém-casado, ainda sem herdeiro. Com os nascimentos humanos parando há 5 anos, isso virou medo do reino.</li><li><b>O exército:</b> organizado de forma feudal.</li><li><b>O inimigo:</b> Suth, com guerras constantes.</li><li><b>A moeda:</b> karphel.</li></ul>"
  },
  "pendragons": {
   "titulo": "Os Pendragons",
   "pub": "<p>Uma das seis grandes casas de Katalão, com sede em Atlas. Devotos de Gigas, mestres da tecnologia de mana, conhecidos pelo sangue carregado de <b>mana azul</b>. O Lorde Pendragon de cabelo azul é o mesmo que passou por Midhab.</p><p>A Casa Brennard é vassala deles. Todo mundo em Frontier teme o dia em que eles decidirem 'resolver' o Barro.</p>",
   "gm": "<p>Uma das seis grandes casas de Katalão, sede em Atlas, cabeça <b>Wyver Pendragon</b>. Devotos de Gigas, mestres da tecnologia de mana, amaldiçoados por excesso de <b>mana azul (fluida)</b> no sangue. O Lorde Pendragon de cabelo azul é o mesmo que passou por Midhab.</p><p>A Casa Brennard é vassala deles. Todo mundo em Frontier teme o dia em que eles decidirem 'resolver' o Barro.</p>"
  },
  "barro": {
   "titulo": "O Barro",
   "pub": "<p>O acampamento de lona em volta dos <b>entrepostos</b> do condado, a três horas da muralha: ningens recusados ou ainda esperando o cadastro. Lona de Maxis, peças de máquinas abandonadas e um altar à Isha.</p><p>Quem é cadastrado segue para Frontier e vai morar na <b>Vila Nova</b>, a parte nova da cidade. A cidade ainda chama todos eles de 'o Barro'.</p><p>Líder: Ossa. Voz radical: Faísca.</p>",
   "gm": "<p>O acampamento de lona em volta dos <b>entrepostos</b> do condado, a três horas da muralha: ningens recusados ou ainda esperando o cadastro.</p><p>Quem é cadastrado segue para Frontier e vai morar na <b>Vila Nova</b>. A cidade ainda chama todos eles de 'o Barro'.</p><p>Líder: Ossa. Voz radical: Faísca. Quem manda de verdade na fila e no escuro: a Balança.</p>"
  },
  "berços": {
   "titulo": "Os berços vazios",
   "pub": "<p>Há 5 anos quase nenhum humano nasce, em Frontier e no mundo. Os ningens continuam nascendo.</p><ul><li>Nem o rei de Katalão tem herdeiro.</li><li>Superstição que corre na cidade: 'os ningens estão roubando as almas dos nossos bebês'.</li></ul>",
   "gm": "<p>Há 5 anos quase nenhum humano nasce. Os ningens continuam nascendo porque a alma deles vem do fey.</p><ul><li>Nem o rei de Katalão tem herdeiro.</li><li>Superstição: 'os ningens estão roubando as almas dos nossos bebês'.</li><li>O que ninguém diz: a cidade vai precisar desses braços para colher a cevada.</li></ul>"
  },
  "cadastro": {
   "titulo": "O Cadastro Brennard",
   "pub": "<p>Iniciativa do Lorde Otto, em três etapas:</p><ul><li><b>Nos entrepostos</b>, na estrada: todo mundo que entra no condado é registrado; os ningens recebem uma <b>etiqueta de latão provisória</b>, sem brasão.</li><li><b>Nas cabaninhas do mercado</b>, já em Frontier: recebem uma função e um <b>nome de família</b>, gravado pela prensa do Escrivão Hollan. Toda família nova começa subalterna e pequena, com o brasão dela sob o dos Brennard.</li><li><b>Na Vila Nova</b>: casa na parte nova da cidade, trabalho, ração e toque de recolher.</li></ul>",
   "gm": "<p>Iniciativa do Lorde Otto, em três etapas: registro e etiqueta provisória nos <b>entrepostos</b>; função e <b>nome de família</b> nas cabaninhas do mercado (prensa do Hollan); casa, trabalho e toque de recolher na <b>Vila Nova</b>.</p><ul><li>Para o lorde: braços para a cevada, uma cidade maior e gente que deve tudo a ele.</li><li>Para a Balança: o fim do negócio de etiquetas falsas. Eles sabotam o cadastro e exploram a fila.</li><li>Para os Pendragons: se descobrirem o tamanho, ambição de vassalo.</li><li>Para quem fica de fora: o Barro dos entrepostos.</li></ul>"
  },
  "semsal": {
   "titulo": "O mal sem sal",
   "gm": "<p>O nome que os servos do solar deram. A comida perdeu o gosto, o vinho não aquece, a música não alegra. Depois vem o cansaço que o sono não cura, a falta de vontade de levantar e, em alguns, o desejo de não continuar.</p><ul><li>Atinge sobretudo <b>humanos</b>. Os ningens, de alma vinda do fey, quase não sentem, e a superstição culpa o Barro.</li><li>O Lorde Otto acha que é uma doença chegando ao reino.</li><li><b>Verdade (só o mestre):</b> é a <b>ausência de Dragoalma</b>, o deus das almas. A mesma ferida dos berços vazios e do Rio Parado.</li><li>Se Dragoalma voltar ao trono, o gosto volta primeiro.</li></ul>"
  },
  "rio": {
   "titulo": "O Rio Parado",
   "pub": "<p>O rio que corta a cidade desacelerou e não reflete mais nada. Os moradores juram ver silhuetas atravessando de noite para lugar nenhum. Ninguém sabe explicar.</p>",
   "gm": "<p>O rio da fronteira desacelerou e não reflete mais nada. De noite, silhuetas atravessam para lugar nenhum.</p><p>Sem Dragoalma, os mortos da região não partem. É a pista da missão de Dragoalma e a ligação com o espírito do Sargento Aldric.</p>"
  },
  "tributo": {
   "titulo": "O tributo do dragão",
   "pub": "<p>Pela lei de controle alimentar dos dragões, estipulada pela Deusa Imperadora Karphel, de Amaranth, Frontier paga ao Rubrasol um tributo de gado por estação.</p><p>Neste inverno ele está atrasado e menor. Os camponeses temem que o dragão se sirva sozinho, e alguns sussurram: 'e se o tributo fosse... outra coisa?'</p>"
  }
 },
 "gm": {
  "entregadores": [
   [
    "Sir Flynn Mason, em nome dos Pendragons",
    "O lorde manda o seu cavaleiro-guarda. Mais frio e mais justo que o lorde, com a mesma autoridade."
   ],
   [
    "O Lorde Pendragon chega no meio da visita",
    "O Oruvel o chamou ou o boato chegou. Pânico, o Brennard perde o controle, os reféns são tomados. As tarefas decidem se há chacina no Barro."
   ],
   [
    "O Lorde Otto Brennard",
    "Sem Pendragon, com o medo dele no ar. Testa se os forasteiros servem ao plano dele, o cadastro e a cidade maior, antes de decidir o que contar aos Pendragons."
   ],
   [
    "A Lady Isolde, por fora",
    "Usa os forasteiros para provar que dar direitos funciona melhor que dar coleiras."
   ],
   [
    "Uma mistura",
    "Começa com os Brennard e o Pendragon chega no meio, mudando as regras."
   ]
  ],
  "gatilhos": [
   "O Oruvel manda a carta aos Pendragons pelas costas do lorde.",
   "O Faísca organiza um saque ao celeiro.",
   "Uma criança humana nasce morta e a igreja culpa o Barro.",
   "Os mortos do Rio Parado são vistos dentro da muralha.",
   "Lampiões e sinos param: um dirigível com o brasão Pendragon aparece no céu.",
   "Um forte da Linha dos Fortins para de responder ao telégrafo.",
   "A Caçadora Escarlate (Mozan Magnum) chega, ou manda batedores Magnum atrás de forasteiros.",
   "O tributo do Rubrasol vence, e não há gado suficiente.",
   "Os Corredores de Trevas trazem ningens achados na estrada, ou levam um do Barro.",
   "A Balança oferece a forasteiros escoltar uma carga de chapas falsas.",
   "A Balança queima o livro do cadastro, ou mata um cadastrado para assustar os outros.",
   "Um servo do solar some de madrugada e é visto andando para dentro do Rio Parado. O mal sem sal deixa de ser segredo."
  ],
  "boatos": [
   "O Oruvel já escreveu para os Pendragons. Só falta o lorde saber.",
   "No rio tem gente atravessando de noite, e ninguém chega do outro lado.",
   "Maxis mandou mercenários para 'resolver' os ningens. Dizem que foram eles que soltaram os ningens em primeiro lugar.",
   "O lorde está dando sobrenome para bicho. Daqui a pouco tem mais família de ningen que de gente.",
   "Na cozinha do solar dizem que o vinho do lorde volta cheio da mesa há semanas.",
   "O dragão não comeu o tributo da primavera. Ele está guardando fome.",
   "Tem um cavaleiro coelho dos Pendragons perguntando pelo Barro na estalagem. Um de nós, servindo eles.",
   "Os motoqueiros de chapéu levaram a filha do Tobias do Barro. Dizem que foi para a cidade central.",
   "Quer latão bom? Fala com o Grimm. Etiqueta dele toca a campainha.",
   "Uma estrategista de uma casa de alfaiates passou por aqui indo para Atlarin, procurando mercenários."
  ]
 }
};

export const NPC_GRUPOS = {"pend":"Pendragons","gov":"Governo e igreja","mil":"Militar","barro":"O Barro","fora":"Força de fora","crime":{"pub":"Comércio","gm":"Crime"}};

export const NPCS = [
 {
  "id": "frontier_flynn",
  "cidade": "frontier",
  "reino": "katalao",
  "nome": "Sir Flynn Mason",
  "papel": "Cavaleiro da Guarda Pendragon",
  "grupo": "pend",
  "img": "mundo/retratos/flynn.jpg",
  "kv": {
   "Raça": "Ningen corredor (coelho)",
   "Arma": "Espada longa e escudo de torre",
   "Etiqueta": "Prata, com brasão Pendragon"
  },
  "texto": "Cavaleiro de armadura branca e dourada a serviço dos Pendragons. Calado e formal; cobre a boca com a manopla enquanto escuta. Muitos ningens o chamam de traidor: um deles, servindo a casa que manda neles.",
  "gm": {
   "kv": {
    "Raça": "Ningen corredor (coelho)",
    "Arma": "Espada longa e escudo de torre",
    "Etiqueta": "Prata, com brasão Pendragon, pelo decreto de guerra",
    "Singularidade": "Passo de Lebre (B): cruza uma zona num salto e se põe entre o aliado e o golpe"
   },
   "texto": "Escudo pessoal do Lorde Pendragon (Wyver), um dos poucos que o acalmam numa crise de mana com uma mão no ombro. Calado, formal, cobre a boca com a manopla enquanto escuta e julga. Acredita que um papel precisa ser merecido, como ele mereceu; despreza quem chega pedindo, mas não aceita chacina de quem não lutou.",
   "segredo": "Foi criado pelos Mason de Maxis como investimento e entregue aos Pendragons num contrato de armas, ainda criança. Carrega o sobrenome de quem o vendeu, e tem vergonha disso. Liderou a cruzada que procurou a filha perdida do Klaus, e falhou.",
   "ganchos": [
    "Pode ser o Pendragon que visita Frontier: toma os reféns e entrega as tarefas.",
    "Pode chegar ao lado do lorde: a mão que impede a chacina, ou que a executa.",
    "Pode chegar antes, discreto, para investigar o Barro e os relatórios do Brennard.",
    
    "Oferecer a um ningen recém-chegado o mesmo caminho que ele teve: a etiqueta de guerra."
   ]
  }
 },
 {
  "id": "frontier_otto",
  "cidade": "frontier",
  "reino": "katalao",
  "nome": "Lorde Otto Brennard",
  "papel": "Senhor de Frontier",
  "grupo": "gov",
  "img": "mundo/retratos/otto.jpg",
  "kv": {
   "Raça": "Humano",
   "Casa": "Brennard, vassala dos Pendragons",
   "Etiqueta": "Ouro",
   "Projeto": "O Cadastro Brennard"
  },
  "texto": "Rígido, de poucas palavras e nenhuma pressa. Diante da onda de ningens, criou o <button class='term' data-term='cadastro'>Cadastro Brennard</button>: entrepostos na estrada, cabaninhas no mercado e uma parte nova da cidade sendo construída. Fala em fazer Frontier crescer.",
  "gm": {
   "kv": {
    "Raça": "Humano, mana estática",
    "Casa": "Brennard (menor), lordes por sangue, vassala dos Pendragons",
    "Etiqueta": "Ouro (quer, um dia, adamantina para os Brennard)",
    "Perfil": "Rígido, inteligente, estratégico",
    "Projeto": "O Cadastro Brennard: nome e função para os foragidos",
    "Ambição": "Ser, um dia, um lorde como os Pendragons"
   },
   "texto": "Rígido, de poucas palavras e nenhuma pressa. Tem um problema enorme nas mãos com a onda de ningens e, em vez de esperar a solução dos Pendragons, criou a própria: o <button class='term' data-term='cadastro'>Cadastro Brennard</button>. Cada foragido registrado recebe uma função, um nome de família e uma etiqueta de latão, e toda família nova começa como subalterna e pequena, abaixo dos Brennard. Para ele isso não é caridade, é estratégia: braços para a cevada que os berços vazios não vão dar, e uma cidade maior, leal a ele. Quer expandir Frontier e, no futuro, ser um lorde do tamanho dos Pendragons.",
   "segredo": "Duas coisas que ninguém da corte sabe: <b>1)</b> Nos relatórios aos Pendragons, o cadastro aparece como 'controle de mão de obra'. Se Atlas entender que ele está criando dezenas de famílias que devem tudo a ele, isso vira ambição, e ambição de vassalo vira traição. <b>2)</b> Ele e boa parte da corte não sentem mais direito o gosto da comida nem os prazeres simples. Os servos, quase todos humanos, estão exaustos, sem vontade de nada, e alguns já pensam em não continuar vivendo. Ele acha que é uma doença misteriosa chegando ao reino. É a <button class='term' data-term='semsal'>ausência de Dragoalma</button>.",
   "ganchos": [
    "Pode ser quem entrega as três tarefas, testando se os forasteiros servem ao plano dele.",
    "Oferece a forasteiros um nome de família do cadastro: um presente que também é uma coleira.",
    "Pede discrição: 'os Pendragons não precisam saber de tudo'.",
    "Come na frente dos convidados sem expressão, e o cálice volta cheio: primeira pista do mal sem sal.",
    "Discute com a filha à mesa: ela quer direitos para os cadastrados; ele quer lealdade."
   ]
  }
 },
 {
  "id": "frontier_isolde",
  "cidade": "frontier",
  "reino": "katalao",
  "nome": "Lady Isolde Brennard",
  "papel": "Herdeira da casa",
  "grupo": "gov",
  "kv": {
   "Raça": "Humana"
  },
  "texto": "Filha e herdeira do lorde. Pragmática e reformista: apoia o cadastro e quer que as famílias novas possam subir de latão para bronze pelo trabalho. Discute com o pai, com a igreja e com a guarda sem baixar a voz.",
  "gm": {
   "kv": {
    "Raça": "Humana, mana concentrada",
    "Quer": "Que o cadastro dê direitos, não só nomes",
    "Teme": "Que o pai use os ningens como degrau para a própria ambição"
   },
   "texto": "Pragmática e reformista. Apoia o cadastro do pai, mas quer mais: que as famílias novas possam subir de latão para bronze pelo trabalho, e não fiquem subalternas para sempre. Enfrenta o pai, a igreja e a guarda. Aliada natural de quem chega de fora, mas quer usar forasteiros como argumento político.",
   "segredo": "Já conversou em segredo com o Escrivão Hollan sobre uma brecha legal: o decreto de guerra dos Pendragons dá papel pleno a quem luta por Katalão. Também percebeu que o pai não sente mais o gosto do vinho, e tem medo.",
   "ganchos": [
    "Pode testar forasteiros por fora, para provar ao pai que dar direitos funciona melhor que dar coleiras."
   ]
  }
 },
 {
  "id": "frontier_veyla",
  "cidade": "frontier",
  "reino": "katalao",
  "nome": "Irmã Veyla",
  "papel": "Sacerdotisa da catedral",
  "grupo": "gov",
  "kv": {
   "Raça": "Humana",
   "Deus": "Dragoalma"
  },
  "texto": "Sacerdotisa da catedral de Dragoalma, no Claustro. Anda nervosa: diz a quem quiser ouvir que as orações de passagem não estão funcionando.",
  "gm": {
   "kv": {
    "Raça": "Humana, mana fluida",
    "Deus": "Dragoalma",
    "Estado": "Apavorada"
   },
   "texto": "As orações de passagem pararam de funcionar e as almas não vão embora. Parte da igreja culpa os ningens; ela suspeita de outra coisa.",
   "segredo": "É a ponte para a missão de Dragoalma. Sabe interpretar a alma do Sargento Aldric no julgamento.",
   "ganchos": [
    "Pede a forasteiros que a acompanhem ao Rio Parado de noite.",
    "É quem pode ligar o mal sem sal da corte aos berços vazios e ao rio: tudo é a mesma ferida."
   ]
  }
 },
 {
  "id": "frontier_hollan",
  "cidade": "frontier",
  "reino": "katalao",
  "nome": "Escrivão Hollan",
  "papel": "Guardião do Registro de Papéis",
  "grupo": "gov",
  "kv": {
   "Raça": "Humano",
   "Tem": "A prensa oficial de etiquetas"
  },
  "texto": "Tímido e meticuloso. Trabalha no Distrito do Lorde, numa sala enorme de gavetas com cópias de cada etiqueta da cidade. É quem grava as etiquetas do cadastro e conhece cada brecha da lei.",
  "gm": {
   "kv": {
    "Raça": "Humano, mana fluida",
    "Tem": "A prensa oficial que grava chapas",
    "Sabe": "Todas as brechas da lei"
   },
   "texto": "Tímido e meticuloso. Trabalha numa sala enorme de gavetas com cópias de cada chapa. É o único que pode emitir chapas legítimas.",
   "segredo": "É chantageado pela Balança: algumas chapas 'falsas' do Grimm saem da prensa oficial. Ou resiste, e está em perigo. Escolha na hora.",
   "ganchos": [
    "Brechas: servo por adoção, papel por casamento, papel de guerra pelo decreto Pendragon."
   ]
  }
 },
 {
  "id": "frontier_berta",
  "cidade": "frontier",
  "reino": "katalao",
  "nome": "Berta",
  "papel": "A moleira do Arrabalde",
  "grupo": "gov",
  "kv": {
   "Família": "Muitos netos, os últimos que nasceram na cidade"
  },
  "texto": "Fala pelos camponeses. Não odeia os ningens; tem medo de passar fome por eles. O moinho dela, no Arrabalde, quase não gira desde que o rio desacelerou. Diz que nunca viu a cevada tão fraca.",
  "gm": {
   "kv": {
    "Família": "Muitos netos, os últimos que nasceram"
   },
   "texto": "Boa pessoa, com medo. Não odeia os ningens, tem medo de passar fome por eles.",
   "papel": "A moleira, voz dos camponeses",
   "ganchos": [
    "Representante da vila na tarefa do Celeiro."
   ]
  }
 },
 {
  "id": "frontier_valk",
  "cidade": "frontier",
  "reino": "katalao",
  "nome": "Comandante Hildegard Valk",
  "papel": "Linha dos Fortins",
  "grupo": "mil",
  "kv": {
   "Raça": "Humana",
   "Corpo": "Prótese de pistão na perna esquerda"
  },
  "texto": "Veterana, fala pouco e passa mais tempo nos fortes que na cidade. Vê cada refugiado como uma brecha na fronteira por onde espiões de Maxis, e de Suth, também podem passar.",
  "gm": {
   "kv": {
    "Raça": "Humana, mana estática",
    "Corpo": "Prótese de pistão na perna esquerda",
    "Autoridade": "Acima do Oruvel"
   },
   "texto": "Veterana, fala pouco, passa mais tempo nos fortes que na cidade. Não odeia os ningens, mas vê cada refugiado como uma brecha na fronteira por onde espiões de Maxis também passam, e, pior, de Suth, o inimigo histórico de Katalão.",
   "segredo": "Um dos fortes parou de responder ao telégrafo. Ela ainda não contou a ninguém na cidade.",
   "ganchos": [
    "Ameaça fria: 'se virar guerra, eu fecho a fronteira'.",
    "Aliada que troca ajuda por serviço no forte silencioso."
   ]
  }
 },
 {
  "id": "frontier_oruvel",
  "cidade": "frontier",
  "reino": "katalao",
  "nome": "Capitão Oruvel",
  "papel": "Guarda da cidade",
  "grupo": "mil",
  "kv": {
   "Raça": "Humano",
   "Linha": "Dura"
  },
  "texto": "Comanda a guarda de Frontier e as tropas dos entrepostos. Acha que o Barro é um barril de pólvora e não esconde isso de ninguém.",
  "gm": {
   "kv": {
    "Raça": "Humano, mana estática",
    "Linha": "Dura",
    "Rival": "Comandante Valk"
   },
   "texto": "Acha que o Barro é um barril de pólvora e quer chamar os Pendragons pelas costas do lorde.",
   "segredo": "Desvia grãos do celeiro e vende para a Balança. Subornou o soldado Brenn para mentir no julgamento.",
   "ganchos": [
    "Pode ser quem chama o Pendragon.",
    "Confisco no dia 3 da tarefa do Celeiro."
   ]
  }
 },
 {
  "id": "frontier_ossa",
  "cidade": "frontier",
  "reino": "katalao",
  "nome": "Ossa",
  "papel": "Líder do Barro, nos entrepostos",
  "grupo": "barro",
  "kv": {
   "Raça": "Ningen caçadora (ursa)",
   "Origem": "Fábricas de Maxis"
  },
  "texto": "Idosa e firme. Lidera o acampamento do Barro, em volta dos entrepostos, e negocia com os escrivães e as tropas com dignidade, um nome por vez.",
  "gm": {
   "kv": {
    "Raça": "Ningen caçadora (ursa)",
    "Origem": "Fábrica de Maxis"
   },
   "texto": "Idosa e firme. Lidera o acampamento do Barro em volta dos entrepostos e tenta manter a paz na fila. Negocia com dignidade.",
   "ganchos": [
    "Representante dos ningens na tarefa do Celeiro.",
    "Conhece muitos ningens das fábricas de Maxis pelo nome."
   ]
  }
 },
 {
  "id": "frontier_faisca",
  "cidade": "frontier",
  "reino": "katalao",
  "nome": "Faísca",
  "papel": "Ningen jovem do Barro",
  "grupo": "barro",
  "kv": {
   "Raça": "Ningen corredor (galgo)"
  },
  "texto": "Jovem e raivoso, cansado da fila dos entrepostos. Acha a Ossa fraca e fala em tomar à força o que falta antes do inverno.",
  "gm": {
   "kv": {
    "Raça": "Ningen corredor (galgo)",
    "Quer": "Tomar o que precisam à força antes do inverno"
   },
   "texto": "Acha a Ossa fraca. Os restos dos Garras, uma gangue derrubada em Maxis, vieram para cá com ele.",
   "papel": "Ningen jovem, ex-Garras",
   "segredo": "Despreza a Balança, mas pode aceitar armas deles.",
   "ganchos": [
    "Organiza um saque ao celeiro.",
    "Confronta forasteiros armados: 'vocês têm o que tiraram da gente'."
   ]
  }
 },
 {
  "id": "frontier_garu",
  "cidade": "frontier",
  "reino": "katalao",
  "nome": "Garu e Pipa",
  "papel": "Pai e filha",
  "grupo": "barro",
  "kv": {
   "Garu": "Ningen caçador (lobo), viúvo",
   "Pipa": "7 anos"
  },
  "texto": "Pai e filha do Barro, no acampamento dos entrepostos. Garu não fala muito; Pipa fala com quem se agacha para falar com ela.",
  "gm": {
   "texto": "Garu matou o Sargento Aldric para proteger a Pipa. O primeiro golpe foi defesa; o segundo, com Aldric caído, foi raiva.",
   "ganchos": [
    "Base da tarefa do Julgamento.",
    "Pipa só conta a verdade a quem se agachar para falar com ela."
   ]
  }
 },
 {
  "id": "frontier_vasco",
  "cidade": "frontier",
  "reino": "katalao",
  "nome": "Sir Vasco Flumifogo",
  "papel": "Patrulheiro das estradas do norte",
  "grupo": "mil",
  "img": "mundo/retratos/vasco.jpg",
  "kv": {
   "Casa": "Flumifogo, vassala dos Magnum",
   "Etiqueta": "Ouro",
   "Cargo": "Patrulha as estradas da região norte",
   "Dom da casa": "Fumaça quente, como a de um vulcão"
  },
  "texto": "Cavaleiro de armadura de prata cravejada de rubis e capa vermelha, sempre com cara de quem queria estar em outro lugar. Veio reforçar a patrulha entre os entrepostos e Frontier por causa dos ningens. Exige as etiquetas na estrada e não tem paciência com quem não tem nenhuma.",
  "gm": {
   "kv": {
    "Raça": "Humano, mana estática",
    "Casa": "Flumifogo, vassala dos Magnum",
    "Etiqueta": "Ouro",
    "Cargo": "Patrulha as estradas de toda a região norte de Katalão",
    "Singularidade": "Fumaça vulcânica: cria e manipula fumaça quente, densa e sufocante, como a de um vulcão",
    "Em Frontier": "Reforço à patrulha por causa da onda de ningens"
   },
   "texto": "Cavaleiro de armadura de prata cravejada de rubis e capa vermelha, sempre com cara de quem queria estar em outro lugar. Não tem paciência com pobres nem com quem não tem chapa: fala com eles sem olhar, como se fossem lama na estrada. Detesta o trabalho, que vê como castigo de casa vassala, e o faz mesmo assim, e bem. Em combate é formidável: some dentro da própria fumaça e reaparece onde quer.",
   "segredo": "Responde à casa Magnum, a mesma da Caçadora Escarlate. Se a Mozan pedir notícias de estrangeiros na estrada, ele é quem as dá. E ele odeia dividir as estradas com os Corredores de Trevas, que não respondem a casa nenhuma.",
   "ganchos": [
    "Para forasteiros na estrada e exige as etiquetas: primeiro teste de 'papel' em Katalão.",
    "Pode ser quem pega o Garu, ou quem quer enforcá-lo na hora, sem julgamento.",
    "Rivalidade com o Irmão Corvo: duas patrulhas na mesma estrada, uma com papel e outra sem.",
    "Pode virar aliado relutante de quem mostrar status (uma etiqueta de prata ou ouro, a chapa de guerra, o nome de um clã).",
    "Informante natural da Caçadora Escarlate."
   ]
  }
 },
 {
  "id": "frontier_rubrasol",
  "cidade": "frontier",
  "reino": "katalao",
  "nome": "Rubrasol, o Vigia dos Campos",
  "papel": "Dragão protetor",
  "grupo": "fora",
  "kv": {
   "Natureza": "Dragonato escarlate que ascendeu a dragão",
   "Pacto": "Pendragons"
  },
  "texto": "Velho e enorme, sobrevoa Frontier e a fronteira. Espanta pragas e bandidos e, dizem, afastou uma incursão de Maxis. Fala pouco com humanos. Recebe um <button class='term' data-term='tributo'>tributo de gado</button> da cidade.",
  "gm": {
   "kv": {
    "Natureza": "Dragonato escarlate na terceira ascensão, virou dragão",
    "Divindade": "Ligado a Gigas, deusa da ordem",
    "Pacto": "Pendragons",
    "Lei": "Controle alimentar dos dragões (Deusa Imperadora Karphel)"
   },
   "texto": "Velho e enorme, sobrevoa Frontier e a fronteira. Espanta pragas e bandidos e, dizem, afastou uma incursão de Maxis. Fala pouco com humanos, só com o Lorde Brennard ou com os Pendragons. Ignora os ningens.",
   "segredo": "Os soldados de Maxis mortos no córrego de Midhab: muita gente culpou outro, mas pode ter sido ele.",
   "ganchos": [
    "Tributo de gado atrasado neste inverno.",
    "Se os Pendragons vierem, ele vem junto.",
    "Quem souber falar com dragões pode tentar conversar."
   ]
  }
 },
 {
  "id": "frontier_corvo",
  "cidade": "frontier",
  "reino": "katalao",
  "nome": "Irmão Corvo",
  "papel": "Corredores de Trevas",
  "grupo": "fora",
  "kv": {
   "Veículo": "Motocicleta a vapor com sidecar",
   "Companhia": "Um cão velho e cego"
  },
  "texto": "Calado e educado. Lidera o comboio de motociclistas que seguem o Trevas e patrulham as estradas. Não responde ao lorde nem à guarda.",
  "gm": {
   "texto": "Calado e educado. Lidera o comboio local de motociclistas da cidade central que segue o Trevas. Não responde ao lorde nem ao Oruvel.",
   "segredo": "Os ningens 'que somem na névoa' vão para a cidade central. Para quê, só a ordem sabe.",
   "ganchos": [
    "Pode reconhecer forasteiros que já cruzaram com o Trevas.",
    "Levou a filha do Tobias do Barro."
   ]
  }
 },
 {
  "id": "frontier_grimm",
  "cidade": "frontier",
  "reino": "katalao",
  "nome": "Aurélio Grimm",
  "papel": "Contratos de Colheita Grimm & Filhos",
  "grupo": "crime",
  "kv": {
   "Negócio": "Agência de trabalho e empréstimos",
   "Marca": "Balança de bolso de latão",
   "Etiqueta": "Bronze"
  },
  "texto": "Mercador de chapéu-coco e voz mansa, com amigos na nobreza menor. Arruma trabalho nas fazendas para os ningens e empresta comida no inverno, a pagar em trabalho.",
  "gm": {
   "kv": {
    "Fachada": "Contratos de Colheita Grimm & Filhos",
    "Marca": "Balança de bolso de latão",
    "Etiqueta": "Bronze, legítima, de mercador"
   },
   "texto": "Mercador de chapéu-coco e voz mansa, com etiqueta de bronze legítima e amigos na nobreza menor. Vende etiquetas de latão falsas que passam no leitor, empresta comida a juros cobrados em trabalho e repassa ningens para fábricas de Maxis.",
   "papel": "A Balança",
   "segredo": "Sabota o Cadastro Brennard: se as famílias novas ganharem latão legítimo, o negócio acaba. Pode ter ligação com os Roses de Maxis.",
   "ganchos": [
    "Oferece a forasteiros escoltar uma carga de etiquetas.",
    "Derrubá-lo sem alternativa deixa o Barro sem comida no inverno."
   ]
  }
 }
];
