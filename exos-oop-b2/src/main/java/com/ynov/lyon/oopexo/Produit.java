package com.ynov.lyon.oopexo;

public interface Produit {
    double calculatePrice();
    String getName();
}


public class Kebab implements Produit {

    private int prix;
    private String nom;
    private static final int MAX_INGREDIENTS = 5;
    private ArrayList<String> ingredients;

    public Kebab(int prix, String nom) {
        this.prix = prix;
        this.nom = nom;
        this.ingredients = new ArrayList<>();
    }

    public Kebab(int prix, String nom, ArrayList<String> ingredients) {
        this.prix = prix;
        this.nom = nom;
        this.ingredients = ingredients;
        if (ingredients.size() > MAX_INGREDIENTS) {
            System.out.println("Trop d'ingrédients. Limite atteinte.");
            this.ingredients = new ArrayList<>();
        }
    }

    @Override
    public double calculatePrice() {
        return prix + ingredients.size() * 0.5;
    }

    @Override
    public String getName() {
        return nom + ": " + String.join(", ", ingredients);
    }
}
