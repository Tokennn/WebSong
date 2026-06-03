import java.util.Scanner;

public class Seat {
    private int numero;
    private String classe; // Première, seconde, etc.

    // Constructeur
    
    public Seat(int numero) {
        this.numero = numero;
    }

    // Initialisation du siège
    
    public void initialiser() {
        Scanner scanner = new Scanner(System.in);

        System.out.println("Enter your seat class : ");
        this.classe = scanner.nextLine();
    }

    // Getters
    public int getNumero() {
        return numero;
    }

    public String getClasse() {
        return classe;
    }

    // Méthode pour afficher les informations
    
    @Override
    public String toString() {
        return "Seat [Number=" + numero + ", Class=" + classe + "]";
    }
}
