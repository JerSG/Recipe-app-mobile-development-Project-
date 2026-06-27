import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  TextInput,
  Alert,
  StyleSheet,
} from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { WebView } from "react-native-webview";
import { COLORS } from "./components/colors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

const FAVORITES_KEY = "FAVORITE_RECIPES";
const getFavorites = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(FAVORITES_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (e) {
    console.error("Error reading favorites", e);
    return [];
  }
};
const saveFavorite = async (recipe) => {
  try {
    const favorites = await getFavorites();
    const exists = favorites.some((item) => item.id === recipe.id);
    if (!exists) {
      const newFavorites = [...favorites, recipe];
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
    }
  } catch (e) {
    console.error("Error saving favorite", e);
  }
};

const removeFavorite = async (id) => {
  try {
    const favorites = await getFavorites();
    const newFavorites = favorites.filter((item) => item.id !== id);
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
  } catch (e) {
    console.error("Error removing favorite", e);
  }
};

const isFavorite = async (id) => {
  const favorites = await getFavorites();
  return favorites.some((item) => item.id === id);
};

//API from MealDB website 
const BASE_URL = "https://www.themealdb.com/api/json/v1/1";

const MealAPI = {
  searchMealsByName: async (query) => {
    try {
      const response = await fetch(
        `${BASE_URL}/search.php?s=${encodeURIComponent(query)}`
      );
      const data = await response.json();
      return data.meals || [];
    } catch (error) {
      console.error("Error searching meals by name:", error);
      return [];
    }
  },

  getMealById: async (id) => {
    try {
      const response = await fetch(`${BASE_URL}/lookup.php?i=${id}`);
      const data = await response.json();
      return data.meals ? data.meals[0] : null;
    } catch (error) {
      console.error("Error getting meal by id:", error);
      return null;
    }
  },

  getRandomMeal: async () => {
    try {
      const response = await fetch(`${BASE_URL}/random.php`);
      const data = await response.json();
      return data.meals ? data.meals[0] : null;
    } catch (error) {
      console.error("Error getting random meal:", error);
      return null;
    }
  },

  getRandomMeals: async (count = 6) => {
    try {
      const promises = Array(count)
        .fill()
        .map(() => MealAPI.getRandomMeal());
      const meals = await Promise.all(promises);
      return meals.filter((meal) => meal !== null);
    } catch (error) {
      console.error("Error getting random meals:", error);
      return [];
    }
  },

  getCategories: async () => {
    try {
      const response = await fetch(`${BASE_URL}/categories.php`);
      const data = await response.json();
      return data.categories || [];
    } catch (error) {
      console.error("Error getting categories:", error);
      return [];
    }
  },

  filterByIngredient: async (ingredient) => {
    try {
      const response = await fetch(
        `${BASE_URL}/filter.php?i=${encodeURIComponent(ingredient)}`
      );
      const data = await response.json();
      return data.meals || [];
    } catch (error) {
      console.error("Error filtering by ingredient:", error);
      return [];
    }
  },

  filterByCategory: async (category) => {
    try {
      const response = await fetch(
        `${BASE_URL}/filter.php?c=${encodeURIComponent(category)}`
      );
      const data = await response.json();
      return data.meals || [];
    } catch (error) {
      console.error("Error filtering by category:", error);
      return [];
    }
  },

  transformMealData: (meal) => {
    if (!meal) return null;

    const ingredients = [];
    for (let i = 1; i <= 20; i++) {
      const ingredient = meal[`strIngredient${i}`];
      const measure = meal[`strMeasure${i}`];
      if (ingredient && ingredient.trim()) {
        const measureText =
          measure && measure.trim() ? `${measure.trim()} ` : "";
        ingredients.push(`${measureText}${ingredient.trim()}`);
      }
    }

    const instructions = meal.strInstructions
      ? meal.strInstructions.split(/\r?\n/).filter((step) => step.trim())
      : [];

    return {
      id: meal.idMeal,
      title: meal.strMeal,
      description: meal.strInstructions
        ? meal.strInstructions.substring(0, 120) + "..."
        : "Delicious meal from TheMealDB",
      image: meal.strMealThumb,
      cookTime: "30 minutes",
      servings: 4,
      category: meal.strCategory || "Main Course",
      area: meal.strArea,
      ingredients,
      instructions,
      youtubeUrl: meal.strYoutube || null,
      originalData: meal,
    };
  },
};

//Loading Spinner 
const LoadingSpinner = ({ message, size = "large" }) => (
  <View
    style={{
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    }}
  >
    <Ionicons
      name="refresh"
      size={32}
      color={COLORS.primary}
      style={{ marginBottom: 12 }}
    />
    <Text style={{ color: COLORS.primary, fontSize: 16 }}>{message}</Text>
  </View>
);

//Category filter component
const CategoryFilter = ({ categories, selectedCategory, onSelectCategory }) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginVertical: 12 }}
    >
      {categories.map((cat) => (
        <TouchableOpacity
          key={cat.id}
          onPress={() => onSelectCategory(cat.name)}
          style={{
            paddingHorizontal: 14,
            paddingVertical: 8,
            backgroundColor:
              selectedCategory === cat.name ? COLORS.primary : COLORS.gray,
            borderRadius: 20,
            marginRight: 8,
          }}
        >
          <Text style={{ color: COLORS.black, fontWeight: "600" }}>
            {cat.name}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

//Recipe Card Component
const RecipeCard = ({ recipe, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    style={{
      flex: 1,
      margin: 5,
      backgroundColor: COLORS.white,
      borderRadius: 8,
      shadowColor: COLORS.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    }}
    activeOpacity={0.8}
  >
    <Image
      source={{ uri: recipe.image }}
      style={{ height: 120, borderTopLeftRadius: 8, borderTopRightRadius: 8 }}
      contentFit="cover"
      transition={300}
    />
    <View style={{ padding: 8 }}>
      <Text
        numberOfLines={2}
        style={{ fontWeight: "700", fontSize: 14, marginBottom: 4 }}
      >
        {recipe.title}
      </Text>
      <Text numberOfLines={2} style={{ color: COLORS.textLight, fontSize: 12 }}>
        {recipe.description}
      </Text>
    </View>
  </TouchableOpacity>
);

//Home screen 
const HomeScreen = ({ navigation }) => {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [recipes, setRecipes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [featuredRecipe, setFeaturedRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [apiCategories, randomMeals, featuredMeal] = await Promise.all([
        MealAPI.getCategories(),
        MealAPI.getRandomMeals(12),
        MealAPI.getRandomMeal(),
      ]);

      const transformedCategories = apiCategories.map((cat, index) => ({
        id: index + 1,
        name: cat.strCategory,
        image: cat.strCategoryThumb,
        description: cat.strCategoryDescription,
      }));
      setCategories(transformedCategories);
      if (!selectedCategory) setSelectedCategory(transformedCategories[0].name);

      const transformedMeals = randomMeals
        .map(MealAPI.transformMealData)
        .filter(Boolean);
      setRecipes(transformedMeals);

      const transformedFeatured = MealAPI.transformMealData(featuredMeal);
      setFeaturedRecipe(transformedFeatured);
    } catch (error) {
      console.log("Error loading the data", error);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);

  const loadCategoryData = async (category) => {
    try {
      const meals = await MealAPI.filterByCategory(category);
      setRecipes(meals.map(MealAPI.transformMealData).filter(Boolean));
    } catch (error) {
      console.error("Error loading category data:", error);
      setRecipes([]);
    }
  };

  const handleCategorySelect = async (category) => {
    setSelectedCategory(category);
    await loadCategoryData(category);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading && !refreshing)
    return <LoadingSpinner message="Loading delicious recipes..." />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.white }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
        contentContainerStyle={{ padding: 12, paddingBottom: 60 }}
      >
        {/* Animal Icons */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-around",
            marginBottom: 12,
          }}
        >
          <Image
            source={require("./assets/images/lamb.png")}
            style={{ width: 80, height: 80 }}
          />
          <Image
            source={require("./assets/images/chicken.png")}
            style={{ width: 80, height: 80 }}
          />
          <Image
            source={require("./assets/images/pork.png")}
            style={{ width: 80, height: 80 }}
          />
        </View>

        {/* Featured Section */}
        {featuredRecipe && (
          <TouchableOpacity
            onPress={() =>
              navigation.navigate("RecipeDetail", { id: featuredRecipe.id })
            }
            activeOpacity={0.9}
            style={{
              marginBottom: 12,
              borderRadius: 12,
              overflow: "hidden",
              shadowColor: COLORS.black,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 6,
              elevation: 4,
            }}
          >
            <Image
              source={{ uri: featuredRecipe.image }}
              style={{ height: 180, width: "100%" }}
              contentFit="cover"
              transition={500}
            />
            <View
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: "rgba(0,0,0,0.5)",
                padding: 12,
              }}
            >
              <Text
                style={{ color: COLORS.white, fontSize: 18, fontWeight: "700" }}
                numberOfLines={2}
              >
                {featuredRecipe.title}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Categories */}
        <CategoryFilter
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={handleCategorySelect}
        />

        {/* Recipes Grid */}
        <FlatList
          data={recipes}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: "space-between" }}
          renderItem={({ item }) => (
            <RecipeCard
              recipe={item}
              onPress={() =>
                navigation.navigate("RecipeDetail", { id: item.id })
              }
            />
          )}
          scrollEnabled={false}
          ListEmptyComponent={
            <View style={{ alignItems: "center", marginTop: 20 }}>
              <Ionicons
                name="restaurant-outline"
                size={64}
                color={COLORS.textLight}
              />
              <Text
                style={{ color: COLORS.textLight, fontSize: 16, marginTop: 8 }}
              >
                No recipes found. Try another category.
              </Text>
            </View>
          }
        />
      </ScrollView>
    </SafeAreaView>
  );
};

//Search Screen 
const SearchScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const debounceRef = useRef(null);

  const performSearch = async (query) => {
    if (!query.trim()) {
      const randomMeals = await MealAPI.getRandomMeals(12);
      return randomMeals.map(MealAPI.transformMealData).filter(Boolean);
    }
    let results = await MealAPI.searchMealsByName(query);
    if (results.length === 0) {
      results = await MealAPI.filterByIngredient(query);
    }
    return results.slice(0, 12).map(MealAPI.transformMealData).filter(Boolean);
  };

  useEffect(() => {
    (async () => {
      const results = await performSearch("");
      setRecipes(results);
      setInitialLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (initialLoading) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const results = await performSearch(searchQuery);
      setRecipes(results);
      setLoading(false);
    }, 300);
  }, [searchQuery, initialLoading]);

  if (initialLoading) return <LoadingSpinner message="Loading recipes..." />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.white }}>
    <View style={{ flex: 1, padding: 12 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 12,
          borderWidth: 1,
          borderColor: COLORS.border,
          borderRadius: 8,
          paddingHorizontal: 12,
        }}
      >
        <Ionicons name="search" size={20} color={COLORS.textLight} />
        <TextInput
          placeholder="Search recipes, ingredients..."
          placeholderTextColor={COLORS.textLight}
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={{ flex: 1, padding: 8, color: COLORS.black }}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={20} color={COLORS.textLight} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={{ marginBottom: 8, fontWeight: "700", fontSize: 16 }}>
        {searchQuery ? `Results for "${searchQuery}"` : "Popular Recipes"} (
        {recipes.length})
      </Text>

      {loading ? (
        <LoadingSpinner message="Searching recipes..." size="small" />
      ) : (
        <FlatList
          data={recipes}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: "space-between" }}
          renderItem={({ item }) => (
            <RecipeCard
              recipe={item}
              onPress={() =>
                navigation.navigate("RecipeDetail", { id: item.id })
              }
            />
          )}
          ListEmptyComponent={
            <View style={{ alignItems: "center", marginTop: 20 }}>
              <Ionicons
                name="search-outline"
                size={64}
                color={COLORS.textLight}
              />
              <Text
                style={{ color: COLORS.textLight, fontSize: 16, marginTop: 8 }}
              >
                No recipes found. Try different keywords.
              </Text>
            </View>
          }
        />
      )}
    </View>
    </SafeAreaView>
  );
};

//Favourites Screen 
const FavoritesScreen = ({ navigation }) => {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadFavorites = async () => {
    const saved = await getFavorites();
    setFavorites(saved);
    setLoading(false);
  };

  useEffect(() => {
    loadFavorites();
    const unsubscribe = navigation.addListener("focus", loadFavorites);
    return unsubscribe;
  }, [navigation]);

  if (loading) return <LoadingSpinner message="Loading favorites..." />;

  return (<SafeAreaView style={{ flex: 1, backgroundColor: COLORS.white }}>
    <FlatList
      data={favorites}
      numColumns={2}
      keyExtractor={(item) => item.id}
      columnWrapperStyle={{ justifyContent: "space-between" }}
      renderItem={({ item }) => (
        <RecipeCard
          recipe={item}
          onPress={() => navigation.navigate("RecipeDetail", { id: item.id })}
        />
      )}
      ListEmptyComponent={
        <View style={{ alignItems: "center", marginTop: 40, padding: 12 }}>
          <Ionicons name="heart-outline" size={64} color={COLORS.textLight} />
          <Text>No favorites yet</Text>
        </View>
      }
      contentContainerStyle={{ padding: 12 }}
    />
    </SafeAreaView>
  );
};
//Helper function to convert youtube link into embed link
const getYouTubeEmbedUrl = (url) => {
  if (!url) return null;

  // Example: https://www.youtube.com/watch?v=abcd1234 → abcd1234
  const regex = /[?&]v=([^&#]*)/;
  const match = url.match(regex);

  if (match && match[1]) {
    return `https://www.youtube.com/embed/${match[1]}`;
  }

  // If it's already a short link like youtu.be/abcd1234
  const shortRegex = /youtu\.be\/([^&#]*)/;
  const shortMatch = url.match(shortRegex);

  if (shortMatch && shortMatch[1]) {
    return `https://www.youtube.com/embed/${shortMatch[1]}`;
  }

  // fallback: return original URL
  return url;
};
//Recipe Details Screen 
const RecipeDetailScreen = ({ route, navigation }) => {
  const { id } = route.params;
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadDetail = async () => {
      const meal = await MealAPI.getMealById(id);
      if (meal) {
        const transformed = MealAPI.transformMealData(meal);
        setRecipe(transformed);
        const saved = await isFavorite(transformed.id);
        setIsSaved(saved);
      }
      setLoading(false);
    };
    loadDetail();
  }, [id]);

  const handleToggleSave = async () => {
    if (isSaved) {
      await removeFavorite(recipe.id);
      setIsSaved(false);
    } else {
      await saveFavorite(recipe);
      setIsSaved(true);
    }
  };

  if (loading) return <LoadingSpinner message="Loading recipe details..." />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.white }}>
    <View style={{ flex: 1, backgroundColor: COLORS.white }}>
      <ScrollView>
        <View style={{ position: "relative" }}>
          <Image
            source={{ uri: recipe.image }}
            style={{ height: 220, width: "100%" }}
            contentFit="cover"
          />
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.5)", "rgba(0,0,0,0.9)"]}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: 80,
            }}
          />
          <TouchableOpacity
            style={{
              position: "absolute",
              top: 40,
              left: 20,
              backgroundColor: "rgba(0,0,0,0.5)",
              borderRadius: 20,
              padding: 8,
            }}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              position: "absolute",
              top: 40,
              right: 20,
              backgroundColor: isSaving ? COLORS.gray : COLORS.primary,
              borderRadius: 20,
              padding: 8,
              flexDirection: "row",
              alignItems: "center",
            }}
            onPress={handleToggleSave}
            disabled={isSaving}
          >
            <Ionicons
              name={
                isSaving
                  ? "hourglass"
                  : isSaved
                  ? "bookmark"
                  : "bookmark-outline"
              }
              size={24}
              color={COLORS.white}
            />
            <Text
              style={{
                color: COLORS.white,
                marginLeft: 6,
                fontWeight: "600",
              }}
            >
              {isSaved ? "Saved" : "Save"}
            </Text>
          </TouchableOpacity>
          <View
            style={{
              position: "absolute",
              bottom: 10,
              left: 20,
            }}
          >
            <Text
              style={{
                color: COLORS.white,
                fontSize: 20,
                fontWeight: "700",
                maxWidth: "80%",
              }}
              numberOfLines={2}
            >
              {recipe.title}
            </Text>
            {recipe.area && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginTop: 4,
                }}
              >
                <Ionicons name="location" size={16} color={COLORS.white} />
                <Text style={{ color: COLORS.white, marginLeft: 6 }}>
                  {recipe.area} Cuisine
                </Text>
              </View>
            )}
          </View>
        </View>
        <View style={{ padding: 12 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-around",
              marginBottom: 12,
            }}
          >
            <View
              style={{
                alignItems: "center",
                backgroundColor: "#FF6B6B",
                borderRadius: 8,
                padding: 12,
                width: 100,
              }}
            >
              <Ionicons name="time" size={24} color={COLORS.white} />
              <Text
                style={{ color: COLORS.white, fontWeight: "700", marginTop: 6 }}
              >
                {recipe.cookTime}
              </Text>
              <Text style={{ color: COLORS.white }}>Prep Time</Text>
            </View>

            <View
              style={{
                alignItems: "center",
                backgroundColor: "#4ECDC4",
                borderRadius: 8,
                padding: 12,
                width: 100,
              }}
            >
              <Ionicons name="people" size={24} color={COLORS.white} />
              <Text
                style={{ color: COLORS.white, fontWeight: "700", marginTop: 6 }}
              >
                {recipe.servings}
              </Text>
              <Text style={{ color: COLORS.white }}>Servings</Text>
            </View>
          </View>
          {/* Video Tutorial */}
          {recipe.youtubeUrl && (
            <View style={{ marginBottom: 20 }}>
              <Text
                style={{
                  fontWeight: "700",
                  fontSize: 16,
                  marginBottom: 6,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <Ionicons
                  name="play"
                  size={16}
                  color={COLORS.primary}
                  style={{ marginRight: 8 }}
                />
                Video Tutorial
              </Text>

              <View
                style={{ height: 220, borderRadius: 12, overflow: "hidden" }}
              >
                <WebView
                  source={{ uri: getYouTubeEmbedUrl(recipe.youtubeUrl) }}
                  allowsFullscreenVideo
                  mediaPlaybackRequiresUserAction={false}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          )}
          {/* Ingredients */}
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                fontWeight: "700",
                fontSize: 16,
                marginBottom: 6,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Ionicons
                name="list"
                size={16}
                color={COLORS.primary}
                style={{ marginRight: 8 }}
              />
              Ingredients ({recipe.ingredients.length})
            </Text>
            {recipe.ingredients.map((ingredient, i) => (
              <View
                key={i}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginVertical: 4,
                  borderBottomWidth: 1,
                  borderBottomColor: COLORS.border,
                  paddingBottom: 4,
                }}
              >
                <Text
                  style={{
                    marginRight: 12,
                    backgroundColor: COLORS.primary,
                    color: COLORS.white,
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    textAlign: "center",
                    lineHeight: 24,
                    fontWeight: "700",
                  }}
                >
                  {i + 1}
                </Text>
                <Text style={{ flex: 1 }}>{ingredient}</Text>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={20}
                  color={COLORS.textLight}
                />
              </View>
            ))}
          </View>
          {/* Instructions */}
          <View style={{ marginBottom: 40 }}>
            <Text
              style={{
                fontWeight: "700",
                fontSize: 16,
                marginBottom: 6,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Ionicons
                name="book"
                size={16}
                color={COLORS.primary}
                style={{ marginRight: 8 }}
              />
              Instructions ({recipe.instructions.length})
            </Text>
            {recipe.instructions.map((step, i) => (
              <View
                key={i}
                style={{
                  flexDirection: "row",
                  marginBottom: 12,
                }}
              >
                <View
                  style={{
                    backgroundColor: COLORS.primary,
                    borderRadius: 12,
                    width: 28,
                    height: 28,
                    justifyContent: "center",
                    alignItems: "center",
                    marginRight: 12,
                  }}
                >
                  <Text style={{ color: COLORS.white, fontWeight: "700" }}>
                    {i + 1}
                  </Text>
                </View>
                <Text style={{ flex: 1 }}>{step}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
    </SafeAreaView>
  );
};
//Navigation Setup
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const Tabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: COLORS.primary,
      tabBarInactiveTintColor: COLORS.gray,
      tabBarIcon: ({ color, size }) => {
        let iconName;
        if (route.name === "Home") iconName = "home";
        else if (route.name === "Search") iconName = "search";
        else if (route.name === "Favorites") iconName = "heart";
        return <Ionicons name={iconName} size={size} color={color} />;
      },
    })}
  >
    <Tab.Screen name="Home" component={HomeScreen} />
    <Tab.Screen name="Search" component={SearchScreen} />
    <Tab.Screen name="Favorites" component={FavoritesScreen} />
  </Tab.Navigator>
);
export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Tabs" component={Tabs} />
        <Stack.Screen
          name="RecipeDetail"
          component={RecipeDetailScreen}
          options={{ headerShown: true, title: "Recipe Detail" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
