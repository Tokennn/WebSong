package com.example;

import javafx.application.Application;
import javafx.fxml.FXMLLoader;
import javafx.scene.Scene;
import javafx.scene.image.Image;
import javafx.scene.paint.Color;
import javafx.stage.Stage;
import javafx.stage.StageStyle;

public class MainApp extends Application {

    @Override
    public void start(Stage stage) throws Exception {
        FXMLLoader loader = new FXMLLoader(getClass().getResource("MainWindowInterface.fxml"));

        Scene scene = new Scene(loader.load());

        scene.setFill(Color.TRANSPARENT);

        stage.setScene(scene);
        stage.initStyle(StageStyle.TRANSPARENT);
        stage.setResizable(false);
        stage.setTitle("Calculator");
        stage.getIcons().add(new Image(getClass().getResourceAsStream("/icon.png")));

        ((Calculator)loader.getController()).init(stage);
        stage.show();
    }

    public void run() {
        launch();
    }
}


// package com.example;

// import javafx.application.Application;
// import javafx.fxml.FXMLLoader;
// import javafx.scene.Parent;
// import javafx.scene.Scene;
// import javafx.stage.Stage;

// import java.io.IOException;


// public class MainApp extends Application {
//     private static Stage stage;

//     @Override
//     public void start(@SuppressWarnings("exports") Stage s) throws IOException {
//         stage=s;
//         setRoot("primary","");
//     }

//     static void setRoot(String fxml) throws IOException {
//         setRoot(fxml,stage.getTitle());
//     }

//     static void setRoot(String fxml, String title) throws IOException {
//         Scene scene = new Scene(loadFXML(fxml));
//         stage.setTitle(title);
//         stage.setScene(scene);
//         stage.show();
//     }

//     private static Parent loadFXML(String fxml) throws IOException {
//         FXMLLoader fxmlLoader = new FXMLLoader(MainApp.class.getResource("/fxml/"+fxml + ".fxml"));
//         return fxmlLoader.load();
//     }


//     public static void main(String[] args) {
//         launch(args);
//     }

// }
