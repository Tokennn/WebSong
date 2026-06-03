package com.ynov.lyon.oopexo;
import java.util.ArrayList;


public class KebabXL extends Kebab {


    private static final int MAX_INGREDIENTS_XL = 10;
    
    public KebabXL(int prix, String nom) {
        super(prix, nom);
    }

    public KebabXL(int prix, String nom, ArrayList<String> ingredients) {
        super(prix, nom, ingredients);
        if (ingredients.size() > MAX_INGREDIENTS_XL) {
            System.out.println("Trop d'ingrédients. Limite atteinte.");
            this.ingredients = new ArrayList<>();
        }else{
            this.ingredients = ingredients;
        }
    }

    // Méthode pour calculer le prix du Kebab XL
    public double calculatePrice() {
        // Prix de base (hérité de Kebab)
        int prixDeBase = this.getPrix(); // Utilisez une méthode getPrix() dans la classe parent

        // Nombre d'ingrédients
        int nombreIngredients = this.ingredients.size();

        // Calcul du prix total
        double prixTotal = prixDeBase + (nombreIngredients * 0.75);

        return prixTotal;
    }
}
