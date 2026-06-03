import java.util.Scanner;

public class Truck extends MeansTransportMerchandise {
    private String typeMoteur;


    public Truck(double volumeStockage, String typeMoteur) {
        super(volumeStockage);
        this.typeMoteur = typeMoteur;
    }
   public String getTypeMoteur() {
        return typeMoteur;
    }


    public void setTypeMoteur(String typeMoteur) {
        this.typeMoteur = typeMoteur;
    }


    @Override
    public void initialiser() {
        super.initialiser(); 

        Scanner scanner = new Scanner(System.in);

        System.out.println("Enter the type of engine for the truck: ");
        this.typeMoteur = scanner.nextLine();
    }

    @Override
    public String toString() {
        return super.toString() + "\nType of engine: " + typeMoteur;
    }
}
