import java.util.Scanner;

public class Drone extends MeansTransportMerchandise {
    // Constructeur
    public Drone(double volumeStockage) {
        super(volumeStockage);
    }

    @Override
    public void initialiser() {
        super.initialiser(); 

        Scanner scanner = new Scanner(System.in);

        System.out.println("Enter the type of engine for the drone (Electric): ");
     
        this.setVolumeStockage(1); 
    }

    private void setVolumeStockage(int i) {
		// TODO Auto-generated method stub
		
	}

	@Override
    public String toString() {
        return super.toString() + "\nType of engine: Electric";
    }
}
