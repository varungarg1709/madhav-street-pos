const db = supabaseClient;
const rows = `Category	Item	Price	Size	Base
Beverages	Kulhad Chai	29		
Beverages	Black Coffee	49		
Beverages	Cold Drink	49		
Beverages	Hot Coffee	69		
Beverages	Hot Chocolate Milk	79		
Beverages	Virgin Mojito	89		
Beverages	Lemonade (Salty/Sweet)	89		
Beverages	Meethi Lassi	59		
Beverages	Masala Coke	59		
Beverages	Cold Coffee	89		
Mocktail	Blue Lagoon	119		
Water	Water Bottle	27		
Water	Small Water Bottle	6		
Shake	Oreo Shake	139		
Shake	Kitkat Shake	139		
Shake	Vanilla Shake	119		
Shake	Strawberry Shake	119		
Shake	Chocolate Shake	129		
Shake	Butterscotch Shake	129		
Soup	Vegetable Soup	109		
Soup	Manchow Soup	119		
Soup	Tomato Soup	99		
Soup	Sweetcorn Soup	109		
Soup	1/2 Manchow Soup	70		
Pizza	Margherita Pizza - Regular Base	189		Regular Base
Pizza	Onion Capsicum Pizza - Regular Base	199		Regular Base
Pizza	Sweetcorn Pizza - Regular Base	199		Regular Base
Pizza	Mushroom Pizza - Regular Base	229		Regular Base
Pizza	Paneer Tikka Pizza - Regular Base	279		Regular Base
Pizza	Farmhouse Pizza - Regular Base	259		Regular Base
Pizza	Margherita Pizza - Wheat Base	209		Wheat Base
Pizza	Onion Capsicum Pizza - Wheat Base	219		Wheat Base
Pizza	Sweetcorn Pizza - Wheat Base	229		Wheat Base
Pizza	Mushroom Pizza - Wheat Base	249		Wheat Base
Pizza	Paneer Tikka Pizza - Wheat Base	299		Wheat Base
Pizza	Farmhouse Pizza - Wheat Base	279		Wheat Base
Sandwich	Veg Sandwich - White Bread	89		White Bread
Sandwich	Veg Grilled Sandwich - White Bread	129		White Bread
Sandwich	Sweetcorn Sandwich - White Bread	139		White Bread
Sandwich	Paneer Grilled Sandwich - White Bread	159		White Bread
Sandwich	Tandoori Paneer Grilled Sandwich - White Bread	189		White Bread
Sandwich	Club Sandwich - White Bread	179		White Bread
Sandwich	Veg Sandwich - Brown Bread	99		Brown Bread
Sandwich	Veg Grilled Sandwich - Brown Bread	139		Brown Bread
Sandwich	Sweetcorn Sandwich - Brown Bread	149		Brown Bread
Sandwich	Paneer Grilled Sandwich - Brown Bread	169		Brown Bread
Sandwich	Club Sandwich - Brown Bread	189		Brown Bread
Wraps	Veg Wrap	129		
Wraps	Paneer Wrap	149		
Rolls	Frankie Roll	119		
Maggi	Plain Maggi - Single	59		
Maggi	Double Masala Maggi - Single	69		
Maggi	Veg Maggi - Single	89		
Maggi	Cheese Maggi - Single	109		
Maggi	Veg Cheese Maggi - Single	119		
Maggi	Amritsari Maggi - Single	129		
Maggi	Plain Maggi - Double	89		
Maggi	Double Masala Maggi - Double	129		
Maggi	Veg Maggi - Double	139		
Maggi	Cheese Maggi - Double	149		
Maggi	Veg Cheese Maggi - Double	159		
Maggi	Amritsari Maggi - Double	169		
Fries	Salted French Fries	99		
Fries	Peri Peri French Fries	119		
Burger	Veg Burger	59		
Burger	Paneer Burger	79		
Burger	Veg Cheese Burger	79		
Burger	Paneer Cheese Burger	99		
Burger + Fries	Veg Burger with Fries	129		
Burger + Fries	Paneer Burger with Fries	169		
Momos	Veg Steam Momos	109		
Momos	Veg Fried Momos	129		
Momos	Paneer Steam Momos	129		
Momos	Paneer Fried Momos	149		
Momos	Veg Kurkure Momos	129		
Momos	Paneer Kurkure Momos	159		
Momos	Momos Steam Basket (10 Pcs)	179		
Momos	Momos Fried Basket (10 Pcs)	199		
Momos	Jhol Momos	219		
Momos	Tandoori Momos	189		
Pasta	White Sauce Pasta - Half	129	Half	
Pasta	Red Sauce Pasta - Half	119	Half	
Pasta	Mix Sauce Pasta - Half	119	Half	
Pasta	Punjabi Pasta - Half	149	Half	
Pasta	White Sauce Pasta - Full	229	Full	
Pasta	Red Sauce Pasta - Full	219	Full	
Pasta	Mix Sauce Pasta - Full	219	Full	
Pasta	Punjabi Pasta - Full	249	Full	
Noodles	Vegetable Noodles - Half	119	Half	
Noodles	Hakka Noodles - Half	139	Half	
Noodles	Singapore Noodles - Half	149	Half	
Noodles	Thupka - Half	159	Half	
Noodles	Vegetable Noodles - Full	159	Full	
Noodles	Hakka Noodles - Full	179	Full	
Noodles	Singapore Noodles - Full	199	Full	
Noodles	Thupka - Full	219	Full	
Garlic Breads	Cheese Garlic Bread	149		
Garlic Breads	Sweetcorn Garlic Bread	169		
Garlic Breads	Mushroom Garlic Bread	189		
Garlic Breads	Onion Capsicum GB	199		
Garlic Breads	Farmhouse Garlic Bread	209		
Indian Snacks	Dahi Ke Sholay	189		
Indian Snacks	Makhmali Tikki	169		
Indian Snacks	Veg Cutlet	149		
Indian Snacks	Cheese Balls	149		
Indian Snacks	Dahi Kebab	199		
Chinese Snacks	Chilli Paneer	209		
Chinese Snacks	Crispy Corn	159		
Chinese Snacks	Veg Dry Manchurian	169		
Chinese Snacks	Veg Gravy Manchurian	199		
Chinese Snacks	Gobhi Dry Manchurian	189		
Chinese Snacks	Chilli Potato	169		
Chinese Snacks	Honey Chilli Potato	199		
Chinese Snacks	Spring Rolls	169		
Chinese Snacks	Chilli Mushroom	199		
Chinese Snacks	Chinese Platter	349		
Tandoori Starters	Paneer Tikka	279		
Tandoori Starters	Paneer Malai Tikka	299		
Tandoori Starters	Tandoori Mushroom	229		
Tandoori Starters	Masala Chaap	229		
Tandoori Starters	Malai Chaap - Full	249	Full	
Tandoori Starters	Malai Chaap - Half	159	Half	
Tandoori Starters	Achari Chaap	239		
Tandoori Starters	Tandoori Aalo	199		
Tandoori Starters	Tandoori Momos	189		
Tandoori Starters	Tandoori Platter	399		
Indian Curries	Dal Makhani	209		
Indian Curries	Dal Fry/Tadka	189		
Indian Curries	Dal Handi	199		
Indian Curries	Dal Butter	219		
Indian Curries	Amritsar Chole	199		
Indian Curries	Rajma Masala	199		
Indian Curries	Shahi Paneer	289	Full	
Indian Curries	Shahi Paneer - Half	189	Half	
Indian Curries	Paneer Butter Masala	289		
Indian Curries	Kadai Paneer - Full	279	Full	
Indian Curries	Kadai Paneer - Half	179	Half	
Indian Curries	Paneer Do Payaja	289		
Indian Curries	Matar Paneer	289		
Indian Curries	Paneer Bhurji	289		
Indian Curries	Mushroom Matar	249		
Indian Curries	Mushroom Masala	259		
Indian Curries	Mix Vegetable	219		
Indian Curries	Shahi/Masala Chaap	259		
Indian Curries	Jeera Aalu	179		
Breads	Plain Roti	24		
Breads	Butter Roti	29		
Breads	Missi Roti	39		
Breads	Onion Roti	45		
Breads	Hari Mirch Roti	49		
Breads	Lachha Paratha	69		
Breads	Aalu Paratha	69		
Breads	Aalu Payaj Paratha	79		
Breads	Paneer Paratha	109		
Breads	Stuff Naan	89		
Breads	Garlic Naan	99		
Breads	Bread Basket	189		
Rice	Jeera Rice	119		
Rice	Matar Pulao	129		
Rice	Veg Pulao	159		
Rice	Veg Biryani	219		
Rice	Paneer Biryani	259		
Rice	Veg Fried Rice	169		
Rice	Paneer Fried Rice	209		
Rice Combos	Rajma + Rice	139		
Rice Combos	Dal Makhani + Rice	129		
Rice Combos	Chole + Rice	139		
Rice Combos	Kadi + Rice	139		
Rice Combos	Shahi Paneer + Rice	159		
Rice Combos	Dal Fry + Rice	119		
Rice Combos	Sambhar + Rice	129		
Rice Combos	Gravy Manchurian + Veg Fried Rice	249		
Raita	Jeera Raita	79		
Raita	Vegetable Raita	99		
Raita	Boondi Raita	89		
Raita	Pineapple Raita	129		
Raita	Masala Papad	55		
Salad	Green Salad	69		
Salad	Cucumber Salad	49		
Salad	Cream Salad	109		
Salad	Peanut Kuchumber Masala	89		
Thali	Classic Thali	259		
Thali	Special Thali	359		
Thali	Chur Chur Naan Thali	279		
South Indian	Idli Sambhar	129		
South Indian	Masala Idli Sambhar	149		
South Indian	Vada Sambhar	139		
Tawa	Tawa Plain Roti	24		
Tawa	Tawa Butter Roti	29		
Desserts	Gulab Jamun - 1	40		
Desserts	Gulab Jamun - 2	60		
Desserts	Gajar Ka Halwa (Seasonal)	80		
Desserts	Vanilla - Ice Cream Scoop	40		
Desserts	Strawberry - Ice Cream Scoop	40		
Desserts	Butterscotch - Ice Cream Scoop	40		
Desserts	Chocolate - Ice Cream Scoop	40		
Beverages	Cold Coffee with Ice Cream	119		
Introductory Offers	Margherita Pizza - Small Regular Base	99		
Introductory Offers	Farmhouse Pizza - Small Regular Base	149		
Introductory Offers	Farmhouse Pizza - Small Wheat Base	169		
Introductory Offers	Margherita Pizza - Small Regular Base + Masala Coke	129		
Drink Combos	Veg Wrap + Masala Coke	149		
Drink Combos	Peri Peri Fries + Hot Coffee	159		
Drink Combos	Veg Noodles + Cold Drink	199		
Drink Combos	Garlic Bread(2 Pcs) + Cold Coffee	199		
Drink Combos	Margherita Pizza + Cold Drink	229		
Drink Combos	Plain Maggi + Cold Coffee	149		
Drink Combos	Veg Momos(5 Pcs) + Virgin Mojito	159		
Breads	Plain Naan	69		
Tandoori Starters	Paneer Malai Tikka - Half	199	Half	
Student Combos	Veg Burger + Fries + Cold Drink	149		
Student Combos	Veg Noodles + Cold Drink	139		
Student Combos	Veg Sandwich + Masala Coke	99		
Student Combos	Plain Maggi + Cold Drink	89		
Toast	Butter Toast	39		
Salad Bowls	Black Chana with Veggies	129		
Salad Bowls	Roasted Chickpeas with Veggies, Lettuce	149		
Chaat	Chole Bhature	169		
Beverages	Diet Coke	40		
Navratri Special	Vrat Thali	150		
Navratri Special	xtra Kuttu Puri	70		`;

const lines = rows.split("\n").slice(1);

async function insertMenu(){

  // 1. get active menu
  const { data: menu } = await db
    .from("menus")
    .select("id")
    .eq("is_active", true)
    .single();

  if(!menu){
    console.error("❌ No active menu found");
    return;
  }

  // 2. fetch all categories once (IMPORTANT)
  const { data: categories } = await db
    .from("menu_categories")
    .select("id,name");

  const categoryMap = {};
  categories.forEach(c => {
    categoryMap[c.name.trim()] = c.id;
  });

  // 3. prepare bulk insert
  const inserts = [];

  for(const line of lines){

    const [category, item, price, size, base] = line.split("\t");

    if(!item) continue;

    const categoryId = categoryMap[category?.trim()];

    if(!categoryId){
      console.warn("Missing category:", category);
      continue;
    }

    inserts.push({
      item: item.trim(),
      price: Number(price),
      category_id: categoryId,
      size: size || null,
      base: base || null,
      menu_id: menu.id
    });
  }

  // 4. bulk insert (FAST)
  const { error } = await db
    .from("menu_items")
    .insert(inserts);

  if(error){
    console.error("Insert error:", error);
  }else{
    console.log("✅ Inserted", inserts.length, "items");
  }

}

insertMenu();