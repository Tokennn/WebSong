import java.util.Scanner;

public class Autocar extends MeansTransportPassenger {

    private int nombreSieges;
    private boolean isThermique;


    public Autocar(int nombreSieges, boolean isThermique) {
        super();
        this.nombreSieges = nombreSieges;
        this.isThermique = isThermique;
    }

    public int getNombreSieges() {
        return nombreSieges;
    }

    public void setNombreSieges(int nombreSieges) {
        this.nombreSieges = nombreSieges;
    }

    public boolean isThermique() {
        return isThermique;
    }

    public void setThermique(boolean isThermique) {
        this.isThermique = isThermique;
    }


    @Override
    public void initialiser() {
        super.initialiser(); 

        Scanner scanner = new Scanner(System.in);

        System.out.println("Enter the number of seats in the bus: ");
        this.nombreSieges = scanner.nextInt();

        System.out.println("Is the bus thermique? (true/false): ");
        this.isThermique = scanner.nextBoolean();
    }

    @Override
    public String toString() {
        return super.toString() + "\nNumber of Seats: " + nombreSieges + "\nIs Thermique: " + isThermique;
    }
}
