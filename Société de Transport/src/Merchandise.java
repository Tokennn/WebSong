import java.util.Scanner;

public class Merchandise {
    private double volume;
    private String designation;

    // Constructeur
    public Merchandise() {
    }

    // Initialisation de la marchandise
    public void initialiser() {
        Scanner scanner = new Scanner(System.in);

        System.out.println("Enter the volume of the merchandise : ");
        this.volume = scanner.nextDouble();

        scanner.nextLine(); // Pour consommer la ligne après la saisie du volume

        System.out.println("Enter the description of the goods : ");
        this.designation = scanner.nextLine();
    }

    // Getters
    public double getVolume() {
        return volume;
    }

    public String getDesignation() {
        return designation;
    }

    // Méthode pour afficher les informations
    @Override
    public String toString() {
        return "Merchandise [Volume=" + volume + ", Description=" + designation + "]";
    }
}
