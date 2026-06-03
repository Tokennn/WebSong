import java.util.ArrayList;
import java.util.Scanner;

public class MeansTransportPassenger extends MeansTransport {
    private ArrayList<Seat> seats;

    // Constructeur
    public MeansTransportPassenger() {
        super();
        this.seats = new ArrayList<>();
    }

   
    
    @Override
    public void initialiser() {
        super.initialiser();
        Scanner scanner = new Scanner(System.in);

        System.out.println("Enter the total number of seats : ");
        int nombreSeat = scanner.nextInt();
        for (int i = 1; i <= nombreSeat; i++) {
            Seat seat = new Seat(i);
            seat.initialiser();
            seats.add(seat);
        }
    }   
    

 
    public ArrayList<Seat> getSeat() {
        return seats;
    }


    
    @Override
    public String toString() {
        StringBuilder infoSeat = new StringBuilder();
        for (Seat seats : seats) {
            infoSeat.append("\n").append(seats.toString());
        }

        return super.toString() + "\nMeans of transport passengers [Number of seat=" + seats.size() + "]" + infoSeat;
    }
}
