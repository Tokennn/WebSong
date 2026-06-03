import java.util.Scanner;

public class ElectricVehicle extends MeansTransport {

    private boolean besoinCharge;


    public ElectricVehicle() {
        super();
        this.besoinCharge = false;
    }


    public void charger() {
 
        this.besoinCharge = false;
        System.out.println("Charging the electric vehicle.");
    }


    public boolean isBesoinCharge() {
        return besoinCharge;
    }


    public void setBesoinCharge(boolean besoinCharge) {
        this.besoinCharge = besoinCharge;
    }


    @Override
    public void initialiser() {
        super.initialiser();

        Scanner scanner = new Scanner(System.in);

        System.out.println("Does the electric vehicle need charging? (Yes/No): ");
        String besoinChargeStr = scanner.nextLine();

        this.besoinCharge = besoinChargeStr.equalsIgnoreCase("Yes");
    }

    @Override
    public String toString() {
        return super.toString() + "\nElectric Vehicle [Needs charging: " + besoinCharge + "]";
    }
}
