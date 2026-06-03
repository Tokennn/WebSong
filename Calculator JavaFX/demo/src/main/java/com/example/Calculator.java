package com.example;

import javafx.fxml.FXML;
import javafx.scene.control.Label;
import javafx.scene.image.ImageView;
import javafx.scene.input.MouseEvent;
import javafx.scene.layout.Pane;
import javafx.stage.Stage;

public class Calculator {
    @FXML private Pane titlePane;
    @FXML private ImageView btnMinimize, btnClose;
    @FXML private Label lblResult;

    private double x, y;
    private double num1 = 0;
    private String operator = "+";

    public void init(Stage stage) {
        titlePane.setOnMousePressed(mouseEvent -> {
            x = mouseEvent.getSceneX();
            y = mouseEvent.getSceneY();
        });
        titlePane.setOnMouseDragged(mouseEvent -> {
            stage.setX(mouseEvent.getScreenX()-x);
            stage.setY(mouseEvent.getScreenY()-y);
        });

        btnClose.setOnMouseClicked(mouseEvent -> stage.close());
        btnMinimize.setOnMouseClicked(mouseEvent -> stage.setIconified(true));
    }

    @FXML
    void onNumberClicked(MouseEvent event) {
        int value = Integer.parseInt(((Pane)event.getSource()).getId().replace("btn",""));
        lblResult.setText(Double.parseDouble(lblResult.getText())==0?String.valueOf((double)value):String.valueOf(Double.parseDouble(lblResult.getText())*10+value));
    }

    @FXML
    void onSymbolClicked(MouseEvent event) {
        String symbol = ((Pane)event.getSource()).getId().replace("btn","");
        if(symbol.equals("Equals")) {
            double num2 = Double.parseDouble(lblResult.getText());
            switch (operator) {
                case "+" : lblResult.setText((num1+num2) + "");
                case "-" : lblResult.setText((num1-num2) + "");
                case "*" : lblResult.setText((num1*num2) + "");
                case "/" : lblResult.setText((num1/num2) + "");
            }
            operator = ".";
        }
        else if(symbol.equals("Clear")) {
            lblResult.setText(String.valueOf(0.0));
            operator = ".";
        }
        else {
            switch (symbol) {
                case "Plus" : operator = "+";
                case "Minus" : operator = "-";
                case "Multiply" : operator = "*";
                case "Divide" : operator = "/";
            }
            num1 = Double.parseDouble(lblResult.getText());
            lblResult.setText(String.valueOf(0.0));
        }
    }
}

// // package sample;
// package com.example;

// import javafx.event.ActionEvent;
// import javafx.fxml.FXML;
// import javafx.scene.control.TextField;
// import javafx.scene.text.Text;

// public class Calculator {

//     @FXML
//     private TextField textField;

//     @FXML
//     private Text savedNumbers;

//     private String firstNumber = "";

//     private String currentNumber = "";

//     private String calculationType;

//     @FXML
//     void addAction(ActionEvent event) {
//         calculationSetup("+");
//     }

//     @FXML
//     void minusAction(ActionEvent event) {
//         calculationSetup("-");
//     }

//     @FXML
//     void divideAction(ActionEvent event) {
//         calculationSetup("/");
//     }

//     @FXML
//     void multiplicationAction(ActionEvent event) {
//         calculationSetup("*");
//     }

//     public void calculationSetup(String calculationType){
//         this.calculationType = calculationType;
//         firstNumber = currentNumber;
//         currentNumber = "";
//         savedNumbers.setText(firstNumber + " " + calculationType);
//     }

//     @FXML
//     void calculate(ActionEvent event) {
//         int firstNumberInt = Integer.parseInt(firstNumber);
//         int secondNumberInt = Integer.parseInt(currentNumber);

//         switch (calculationType) {
//             case "+" : {
//                 int calculatedNumber = firstNumberInt + secondNumberInt;
//                 savedNumbers.setText(firstNumber + " + " + currentNumber + " = " + calculatedNumber);
//                 textField.setText(String.valueOf(calculatedNumber));
//             }
//             case "-" : {
//                 int calculatedNumber = firstNumberInt - secondNumberInt;
//                 savedNumbers.setText(firstNumber + " - " + currentNumber + " = " + calculatedNumber);
//                 textField.setText(String.valueOf(calculatedNumber));
//             }
//             case "/" : {
//                 double calculatedNumber = firstNumberInt / (double)secondNumberInt;
//                 savedNumbers.setText(firstNumber + " / " + currentNumber + " = " + calculatedNumber);
//                 textField.setText(String.valueOf(calculatedNumber));
//             }
//             case "*" : {
//                 int calculatedNumber = firstNumberInt * secondNumberInt;
//                 savedNumbers.setText(firstNumber + " * " + currentNumber + " = " + calculatedNumber);
//                 textField.setText(String.valueOf(calculatedNumber));
//             }
//         }
//     }

//     @FXML
//     void clearTextField(ActionEvent event) {
//         currentNumber = "";
//         textField.setText("");
//         savedNumbers.setText("");
//     }

//     @FXML
//     void button0Clicked(ActionEvent event) {
//         if(!currentNumber.equals("")){
//             addNumber("0");
//         }
//     }

//     @FXML
//     void button1Clicked(ActionEvent event) {
//         addNumber("1");
//     }

//     @FXML
//     void button2Clicked(ActionEvent event) {
//         addNumber("2");
//     }

//     @FXML
//     void button3Clicked(ActionEvent event) {
//         addNumber("3");
//     }

//     @FXML
//     void button4Clicked(ActionEvent event) {
//         addNumber("4");
//     }

//     @FXML
//     void button5Clicked(ActionEvent event) {
//         addNumber("5");
//     }

//     @FXML
//     void button6Clicked(ActionEvent event) {
//         addNumber("6");
//     }

//     @FXML
//     void button7Clicked(ActionEvent event) {
//         addNumber("7");
//     }

//     @FXML
//     void button8Clicked(ActionEvent event) {
//         addNumber("8");
//     }

//     @FXML
//     void button9Clicked(ActionEvent event) {
//         addNumber("9");
//     }

//     public void updateTextField(){
//         textField.setText(currentNumber);
//     }

//     public void addNumber(String number){
//         currentNumber += number;
//         updateTextField();
//     }
// }