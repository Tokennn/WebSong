package com.ynov.lyon.oopexo;

import java.util.ArrayList;
import java.util.Arrays;

// import com.ynov.lyon.oopexo.App.Kebab;

/**
 * Hello world!
 *
 */
public class App { 

    public static void main( String[] args )
    {
        // partie 1 : Kebab avec 2 constructeurs
        // Kebab sans ingrédients
        Kebab kv = new Kebab(5, "kebab végétarien");

        // Kebab avec ingrédients
        ArrayList<String> ingredients = new ArrayList<String>();
        ingredients.add("poulet");
        ingredients.add("tomates");
        ingredients.add("sauce");
        ingredients.add("patates");
        ingredients.add("salade");
        Kebab kp = new Kebab(6, "Kébab poulet", ingredients);

        // Trop d'ingrédients. Lance ou print un message d'erreur et créé le kebab sans ingrédients
        Kebab kError = new Kebab(6, "Kebab", new ArrayList<>(Arrays.asList("1", "2", "3", "4", "5", "6")));
        System.out.println(kp.prix);
        System.out.println(kp.ingredients);

        

        // partie 2 : access modifiers Kebab, getter setter automatique, puis implémentation correcte calculatePrice, getName, addIngredient
        kv.addIngredient("tomate");
        kv.addIngredient("aubergine");
        kv.addIngredient("concombre");
        kv.addIngredient("salade");
        kv.addIngredient("sauce");
        
       // Doit print message d'erreur
        kv.addIngredient("frites");

        System.out.println(kv.getName() + " " + kv.calculatePrix());
        System.out.println(kp.getName() + " " + kp.calculatePrix());
        // partie 3 : KebabXL, 2 constructeurs, override calculatePrice 
        ingredients.add("boeuf");
        ingredients.add("riz");
        Kebab kxl = new KebabXL(6, "Kébab poulet", ingredients);
        kxl.addIngredient("Error");

        System.out.println(kxl.getName() + " " + kxl.calculatePrix());

        // partie 4 : Interface Produit, Frites, Classe Commande contenant une arrayList de produits, override toString
        // Commande c = new Commande(kxl);
        // c.addProduit(kp);
        // c.addProduit(kv);
        // c.addProduit(new Frites());

        // System.out.println(c);
    }
}
