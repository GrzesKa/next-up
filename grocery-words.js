/* Next Up – grocery word list for automatic aisle sorting (Polish + English).
   Words are lower case without Polish accents; a word also matches longer forms that start
   with it (pomidor → pomidory, tomato → tomatoes). Phrases with spaces are checked first. */
window.NEXTUP_GROCERY = {
  aisles: [
    { key: "produce", name: "Fruit & Veg", sq: "#C9D865", ci: "#245441" },
    { key: "bakery", name: "Bakery", sq: "#E0B84A", ci: "#8C3B2E" },
    { key: "dairy", name: "Dairy & Eggs", sq: "#98A6EF", ci: "#F3C07E" },
    { key: "meat", name: "Meat & Fish", sq: "#D96B4E", ci: "#6E1C3A" },
    { key: "pantry", name: "Pantry", sq: "#B1C29E", ci: "#B58953" },
    { key: "frozen", name: "Frozen", sq: "#BFE3D0", ci: "#2F6F6A" },
    { key: "drinks", name: "Drinks", sq: "#41626F", ci: "#C5D7F2" },
    { key: "snacks", name: "Snacks & Sweets", sq: "#F6CBBB", ci: "#F58A55" },
    { key: "household", name: "Household", sq: "#2F3E66", ci: "#E9D8B0" },
    { key: "personal", name: "Personal care", sq: "#C9B6E8", ci: "#4A2E5C" },
    { key: "other", name: "Other", sq: "#DEDAD2", ci: "#9C9990" },
  ],
  phrases: {
    "coconut milk": "pantry", "mleko kokosowe": "pantry", "almond milk": "drinks", "oat milk": "drinks", "soy milk": "drinks",
    "mleko owsiane": "drinks", "mleko migdalowe": "drinks", "mleko sojowe": "drinks", "napoj owsiany": "drinks",
    "peanut butter": "pantry", "maslo orzechowe": "pantry", "ice cream": "frozen", "frozen pizza": "frozen",
    "mrozona pizza": "frozen", "frozen vegetables": "frozen", "mrozone warzywa": "frozen", "mrozonki": "frozen",
    "hummus chips": "snacks", "tortilla chips": "snacks", "toilet paper": "household", "papier toaletowy": "household",
    "paper towels": "household", "reczniki papierowe": "household", "washing up liquid": "household", "dish soap": "household",
    "plyn do naczyn": "household", "plyn do prania": "household", "proszek do prania": "household", "trash bags": "household",
    "worki na smieci": "household", "kitchen roll": "household", "baking paper": "household", "papier do pieczenia": "household",
    "aluminium foil": "household", "folia aluminiowa": "household", "cling film": "household",
    "pasta do zebow": "personal", "toothpaste": "personal", "szczoteczka do zebow": "personal", "toothbrush": "personal",
    "shower gel": "personal", "zel pod prysznic": "personal", "plyn do higieny": "personal",
    "sour cream": "dairy", "cream cheese": "dairy", "cottage cheese": "dairy", "serek wiejski": "dairy", "ser bialy": "dairy",
    "smietana": "dairy", "olive oil": "pantry", "oliwa z oliwek": "pantry", "soy sauce": "pantry", "sos sojowy": "pantry",
    "tomato sauce": "pantry", "passata": "pantry", "koncentrat pomidorowy": "pantry", "tomato paste": "pantry",
    "canned tomatoes": "pantry", "pomidory w puszce": "pantry", "sparkling water": "drinks", "woda gazowana": "drinks",
    "orange juice": "drinks", "sok pomaranczowy": "drinks", "energy drink": "drinks", "napoj energetyczny": "drinks",
    "spring onion": "produce", "szczypiorek": "produce", "sweet potato": "produce", "batat": "produce",
    "chicken breast": "meat", "piers z kurczaka": "meat", "minced meat": "meat", "mieso mielone": "meat",
    "fish fingers": "frozen", "paluszki rybne": "frozen", "frozen berries": "frozen", "frytki mrozone": "frozen",
    "baking powder": "pantry", "proszek do pieczenia": "pantry", "baking soda": "pantry", "soda oczyszczona": "pantry",
    "corn flakes": "pantry", "platki kukurydziane": "pantry", "platki owsiane": "pantry",
  },
  words: {
    produce: "tomato|pomidor|potato|ziemniak|kartofl|onion|cebul|garlic|czosnek|carrot|marchew|marchewk|cucumber|ogorek|ogork|" +
      "pepper|papryk|lettuce|salat|salata|rukol|rocket|spinach|szpinak|kale|jarmuz|cabbage|kapust|broccoli|brokul|cauliflower|kalafior|" +
      "zucchini|courgette|cukini|cukinia|aubergine|eggplant|baklazan|mushroom|pieczark|grzyb|avocado|awokado|lemon|cytryn|lime|limonk|" +
      "orange|pomarancz|apple|jablk|jablek|banana|banan|pear|grusz|grape|winogron|strawberr|truskaw|raspberr|malin|blueberr|borowk|jagod|" +
      "cherry|cherries|wisni|czeresn|peach|brzoskwin|plum|sliwk|melon|arbuz|watermelon|mango|pineapple|ananas|kiwi|mandarin|mandaryn|" +
      "grapefruit|grejpfrut|celery|seler|leek|por|radish|rzodkiew|beetroot|burak|parsley|pietruszk|dill|koper|basil|bazyli|coriander|" +
      "kolendr|mint|miet|ginger|imbir|chili|chilli|corn|kukurydz|peas|groszek|bean|fasolk|asparagus|szparag|pumpkin|dyni|dynia|" +
      "herbs|ziola|fruit|owoc|veg|warzyw|salad|tomatoes|pomidork|sprouts|kielki|olive|oliwk|berries|figs|figi|daktyl|dates|pomegranate|granat",
    bakery: "bread|chleb|chlebek|roll|bulk|bulka|bagel|bajgiel|baguette|bagietk|croissant|rogal|rogalik|tortilla|wrap|pita|naan|" +
      "toast|tost|bun|drozdzowk|paczek|paczki|ciasto|cake|muffin|babeczk|pie|placek|sourdough|zakwas|graham|kajzerk",
    dairy: "milk|mleko|mleka|cheese|ser|sera|serek|mozzarell|parmesan|parmezan|feta|halloumi|gouda|cheddar|camembert|brie|ricotta|" +
      "mascarpone|twarog|twarozek|yogurt|yoghurt|jogurt|kefir|maslank|butter|maslo|masla|cream|smietan|smietank|egg|eggs|jajk|jaja|jajek|" +
      "skyr|budyn|pudding|margarin|margaryn|labneh|quark|tofu",
    meat: "chicken|kurczak|kurczaka|indyk|turkey|beef|wolowin|pork|wieprzow|schab|boczek|bacon|ham|szynk|salami|sausage|kielbas|parowk|" +
      "mince|mielone|steak|stek|lamb|jagniecin|duck|kaczk|fish|ryba|ryby|salmon|losos|tuna|tunczyk|cod|dorsz|shrimp|prawn|krewetk|" +
      "pstrag|trout|sledz|herring|makrel|mackerel|meat|mieso|wedlin|chorizo|prosciutto|pancetta|pasztet|pate|kabanos|kabanosy",
    pantry: "pasta|makaron|spaghetti|penne|rice|ryz|ryzu|flour|maka|maki|sugar|cukier|salt|sol|oil|olej|oliwa|vinegar|ocet|sauce|sos|" +
      "ketchup|mustard|musztard|mayo|majonez|honey|miod|jam|dzem|konfitur|nutella|cereal|platki|oats|owsian|granola|muesli|musli|" +
      "lentil|soczewic|chickpea|ciecierzyc|beans|fasola|hummus|tahini|couscous|kuskus|quinoa|komos|kasza|kaszy|bulgur|noodle|" +
      "spice|przypraw|cinnamon|cynamon|paprika|oregano|curry|stock|bulion|kostk|yeast|drozdz|cocoa|kakao|coffee|kawa|kawy|tea|herbat|" +
      "nuts|orzech|almond|migdal|seeds|nasion|pestk|raisin|rodzynk|canned|puszk|konserw|soup|zupa|tomato paste|crackers|sucharki|" +
      "breadcrumbs|bulka tarta|bulki tartej|vanilla|wanili|syrup|syrop|chocolate spread|krem czekoladowy|pesto|salsa|olives",
    frozen: "frozen|mrozon|ice|lod|lody|lodow|pierogi|pizza|frytki|fries|dumpling|nuggets",
    drinks: "water|woda|wody|juice|sok|soki|soda|cola|coke|pepsi|sprite|fanta|lemonade|lemoniad|beer|piwo|piwa|wine|wino|wina|" +
      "vodka|wodk|whisky|whiskey|gin|rum|prosecco|cider|cydr|kombucha|smoothie|tonic|tonik|isotonic|izotonik|redbull|monster|napoj",
    snacks: "chips|crisps|czipsy|chipsy|chocolate|czekolad|candy|cukierk|sweets|slodycz|cookie|ciastk|biscuit|herbatnik|wafer|wafl|" +
      "popcorn|pretzel|precel|paluszk|gum|guma|gumy|jelly|zelk|haribo|snickers|twix|bar|baton|batonik|nachos|dip|praliny|lizak",
    household: "detergent|proszek|plyn|soap|mydlo|sponge|gabk|bleach|wybielacz|domestos|ludwik|fairy|vanish|cleaner|czysciw|" +
      "tissues|chusteczk|napkin|serwetk|papier|foil|folia|bags|worki|torebk|battery|batteri|bateri|bulb|zarowk|candle|swieczk|" +
      "rubbish|smieci|kapsulk|tabletki do zmywarki|zmywark|dishwasher|softener|plukank|odswiezacz",
    personal: "shampoo|szampon|conditioner|odzywk|toothpaste|toothbrush|szczoteczk|deodorant|dezodorant|antyperspirant|razor|maszynk|" +
      "golark|shaving|pianka do golenia|lotion|balsam|krem|sunscreen|filtr|spf|tampon|podpask|pads|plaster|plastry|vitamin|witamin|" +
      "ibuprofen|paracetamol|apap|tabletk|floss|nic dentystyczna|cotton|patyczk|platki kosmetyczne|makeup|tusz|pomadk|lip balm|perfum",
  },
};
