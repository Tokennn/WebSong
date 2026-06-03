public class ThermalVehicle extends MeansTransport {
    private boolean besoinVidange;
    private boolean besoinPlein;

  
    public ThermalVehicle() {
        super();
        this.besoinVidange = false;
        this.besoinPlein = false;
    }

   
    public void vidange() {
     
        this.besoinVidange = false;
    }


    public void fairePlein() {
      
        this.besoinPlein = false;
    }


    public boolean isBesoinVidange() {
        return besoinVidange;
    }

 
    public void setBesoinVidange(boolean besoinVidange) {
        this.besoinVidange = besoinVidange;
    }


    public boolean isBesoinPlein() {
        return besoinPlein;
    }


    public void setBesoinPlein(boolean besoinPlein) {
        this.besoinPlein = besoinPlein;
    }


    @Override
    public String toString() {
        return super.toString() + "\nNeed a drain: " + besoinVidange + "\nNeed to fill up: " + besoinPlein;
    }
}
