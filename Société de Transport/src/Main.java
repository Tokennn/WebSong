import java.util.ArrayList;
import java.util.Scanner;

public class Main {

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);

        ArrayList<MeansTransport> meansTransport = new ArrayList<>();

        

       

        int choix;
        do {
            System.out.println("\n1 View all means of transport");
            System.out.println("2 View one of means of transport");
            System.out.println("3 Add means of transport");
            System.out.println("4 Modify a means of transport");
            System.out.println("5 Delete means of transport");
            System.out.println("6 Exit");

            choix = scanner.nextInt();
            scanner.nextLine();

            switch (choix) {
                case 1:
                    for (MeansTransport means : meansTransport) {
                        System.out.println(means.toString());
                    }
                    break;
                case 2:
                    MeansTransport means = trouverMoyenDeTransport(meansTransport);
                    if (means != null) {
                        System.out.println(means.toString());
                    } else {
                        System.out.println("Means of transport not found");
                    }
                    break;
                case 3:
                    System.out.println("1 New means of transport\n2 New means of transport passengers\n3 New means of transport merchandises\n4 New means of transport terhmical\n5 New Drone\n6 New means of transport electric\n7 New Autocar");
                    int nouveauMoyenChoice = scanner.nextInt();
                    scanner.nextLine(); 
                    switch (nouveauMoyenChoice) {
                        case 1:
                        	Truck nouveauTruck = new Truck(0, "");
                            nouveauTruck.initialiser();
                            meansTransport.add(nouveauTruck);
                            break;
                        case 2:
                            MeansTransport nouveauMoyenPassagers = new MeansTransportPassenger();
                            nouveauMoyenPassagers.initialiser();
                            meansTransport.add(nouveauMoyenPassagers);
                            break;
                        case 3:
                        	MeansTransport nouveauMoyenMerchandise = new MeansTransportMerchandise();
                            nouveauMoyenMerchandise.initialiser();
                            meansTransport.add(nouveauMoyenMerchandise);
                            break;
                        case 4:
                            ThermalVehicle nouveauThermalVehicle = new ThermalVehicle();
                            nouveauThermalVehicle.initialiser();
                            meansTransport.add(nouveauThermalVehicle);
                            break;
                        case 5:
                        	Drone nouveauDrone = new Drone(1); 
                            nouveauDrone.initialiser();
                            meansTransport.add(nouveauDrone);
                            break;
                        case 6:
                            ElectricVehicle nouveauElectricVehicle = new ElectricVehicle();
                            nouveauElectricVehicle.initialiser();
                            meansTransport.add(nouveauElectricVehicle);
                            break;
                            
                        case 7:
                            Autocar nouveauAutocar = new Autocar(0, false);
                            nouveauAutocar.initialiser();
                            meansTransport.add(nouveauAutocar);
                            break;

                    }
                    break;
                case 4:
                    MeansTransport moyenAModifier = trouverMoyenDeTransport(meansTransport);
                    if (moyenAModifier != null) {
                        moyenAModifier.modifier();
                    } else {
                        System.out.println("Means of transport not found.");
                    }
                    break;
                case 5:
                    MeansTransport moyenASupprimer = trouverMoyenDeTransport(meansTransport);
                    if (moyenASupprimer != null) {
                        meansTransport.remove(moyenASupprimer);
                    } else {
                        System.out.println("Means of transport not found.");
                    }
                    break;
            }
        } while (choix != 6);
    }

    public static MeansTransport trouverMoyenDeTransport(ArrayList<MeansTransport> Means) {
        Scanner scanner = new Scanner(System.in);

        System.out.println("Enter the type of means of transport you are looking for: ");
        String type = scanner.nextLine();

        for (MeansTransport means : Means) {

            if (means.getClass().getSimpleName().equals(type)) {
                return means;
            }
        }

        return null;
    }
}
