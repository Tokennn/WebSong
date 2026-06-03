import java.util.ArrayList;
import java.util.Scanner;

public class MeansTransportMerchandise extends MeansTransport {
    private double volumeStockage;
    
    private ArrayList<Merchandise> merchandises;


    public MeansTransportMerchandise(double volumeStockage) {
        super();
        this.volumeStockage = volumeStockage;
        this.merchandises = new ArrayList<>();
    }


    
    public MeansTransportMerchandise() {
		// TODO Auto-generated constructor stub
	}

	@Override
    public void initialiser() {
        super.initialiser();
        Scanner scanner = new Scanner(System.in);

        System.out.println("Enter the storage volume : ");
        this.volumeStockage = scanner.nextDouble();


        
        System.out.println("Would you like to add goods ? (Yes/No) : ");
        String choix = scanner.next();
        scanner.nextLine();

        while (choix.equalsIgnoreCase("Oui")) {
        	Merchandise merchandise = new Merchandise();
            merchandise.initialiser();
            merchandises.add(merchandise);

            System.out.println("Would you like to add other goods ? (Yes/No) : ");
            choix = scanner.next();
            scanner.nextLine();
        }
    }


    public double getVolumeStockage() {
        return volumeStockage;
    }

    public ArrayList<Merchandise> getMerchandises() {
        return merchandises;
    }

   
    
    @Override
    public String toString() {
        StringBuilder infoMerchandises = new StringBuilder();
        for (Merchandise merchandise : merchandises) {
            infoMerchandises.append("\n").append(merchandise.toString());
        }

        return super.toString() + "\nMeans of Transport of Goods [Volume of storage=" + volumeStockage + "]" + infoMerchandises;
    }
}
