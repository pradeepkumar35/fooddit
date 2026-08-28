package com.fooddit.restaurant;

/**
 * Maps a (primary) cuisine string onto one of the curated cuisine placeholder
 * tiles shipped at {@code frontend/public/images/cuisine/<bucket>.svg}.
 *
 * <p>The bucket list + match order intentionally mirrors
 * {@code data/import_restaurant_images.py} (first match wins on lowercased
 * contains). Used as the runtime {@code onError} fallback for external image
 * links (which can rot) — the DB itself stores real photos wherever possible.
 */
public final class CuisinePlaceholder {

    private static final String[][] RULES = {
        {"biryani|biriyani", "biryani"},
        {"dosa|idli|vada|uttapam|appam|south indian", "south-indian"},
        {"momo|mandurian|manchurian|noodle|chinese|szechwan|tibetan|pasta|ramen", "chinese"},
        {"pizza", "pizza"},
        {"burger", "burger"},
        {"ice cream|kulfi", "ice-cream"},
        {"cake|bakery|pastry|patisserie|croissant|donut|cupcake", "bakery"},
        {"dessert|sweet|mithai|gulab|halwa|waffle|pancake", "dessert"},
        {"coffee|cafe|tea|juice|shake|smoothie|beverage|cold drink|bubble tea", "cafe"},
        {"roll|kathi", "rolls"},
        {"kebab|tandoor|bbq|grill|barbecue", "grill"},
        {"seafood|fish|prawn|crab|coastal", "seafood"},
        {"thali|combo|meal", "thali"},
        {"sandwich|wrap|burrito|taco|mexican", "sandwich"},
        {"paratha|chole|bhature|pav|mishti", "street-indian"},
        {"north indian|punjabi|hindi|curry|indian|rajasthani|maha|gujarati", "north-indian"},
        {"fast food|snack|street food|fried chicken|sides", "fast-food"},
    };

    private CuisinePlaceholder() {
    }

    /** /images/cuisine/<bucket>.svg for the cuisine, or the generic tile. */
    public static String tileFor(String cuisine) {
        String c = cuisine == null ? "" : cuisine.toLowerCase();
        for (String[] rule : RULES) {
            for (String needle : rule[0].split("\\|")) {
                if (!needle.isEmpty() && c.contains(needle)) {
                    return "/images/cuisine/" + rule[1] + ".svg";
                }
            }
        }
        return "/images/cuisine/generic.svg";
    }
}
