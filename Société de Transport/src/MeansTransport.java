import java.util.Scanner;

public class MeansTransport {
    private static int count = 0;
    private int id;
    private double distanceParcourue;
    private double empreinteCarboneParKm;

    // Constructeur
    
    public MeansTransport() {
        this.id = ++count;
        this.distanceParcourue = 0;
        this.empreinteCarboneParKm = 0;
    }

    // Initialisation du moyen de transport
    
    public void initialiser() {
        Scanner scanner = new Scanner(System.in);

        System.out.println("Enter the total distance traveled : ");
        this.distanceParcourue = scanner.nextDouble();

        System.out.println("Enter the carbon footprint of km traveled : ");
        this.empreinteCarboneParKm = scanner.nextDouble();
    }


    
    public void modifier() {
        Scanner scanner = new Scanner(System.in);

        System.out.println("Enter the new total distance traveled : ");
        this.distanceParcourue = scanner.nextDouble();

        System.out.println("Enter the new carbon footprint of km traveled : ");
        this.empreinteCarboneParKm = scanner.nextDouble();
    }


    
    public int getId() {
        return id;
    }

    public double getDistanceParcourue() {
        return distanceParcourue;
    }

    public double getEmpreinteCarboneParKm() {
        return empreinteCarboneParKm;
    }


    
    @Override
    public String toString() {
        return "Means of transport [Type of transport=" + id + ", Distance traveled=" + distanceParcourue +
               " km, Footprint of km Traveled=" + empreinteCarboneParKm + "]";
    }
}
