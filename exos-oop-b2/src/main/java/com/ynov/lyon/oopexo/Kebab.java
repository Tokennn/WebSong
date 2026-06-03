package com.ynov.lyon.oopexo;

import java.lang.reflect.Array;
import java.util.Arrays;
import java.util.ArrayList;



public class Kebab {

    protected int prix;
    protected String nom;
   protected int nbIngredients = 5;
    protected ArrayList<String> ingredients;

    public Kebab(int prix, String nom) {
        this.prix = prix;
        this.nom = nom;
        this.ingredients = new ArrayList<String>();
    }

    public Kebab(int prix, String nom, ArrayList<String> ingredients) {
        this.prix = prix;
        this.nom = nom;
        this.ingredients = ingredients;
        if (ingredients.size() > nbIngredients) {
            System.out.println("Trop d'ingrédients. Lance ou print un message d'erreur et créé le kebab sans ingrédients");
            this.ingredients = new ArrayList<String>();
        }
    }


public int getPrix() {
        return prix;
    }

    public void setPrix(int prix) {
        this.prix = prix;
    }

    // Getter et Setter pour le nom
    public String getNom() {
        return nom;
    }

    public void setNom(String nom) {
        this.nom = nom;
    }

    public ArrayList<String> getIngredients() {
        return ingredients;
    }

    
    public void addIngredient(String ingredient) {
        if (ingredients.size() < nbIngredients){
            ingredients.add(ingredient);
        } else {
            System.out.println("Trop d'ingrédients. Limite atteinte.");
        }
    }

    public double calculatePrix() {
        prix += ingredients.size() * 0.5;
        return prix;
    }

    public String getName() {
        return nom + ": " + String.join(", ", ingredients);
    }
}