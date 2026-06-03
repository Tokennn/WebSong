package com.example.triviaproject;

import javafx.fxml.FXML;
import javafx.scene.control.Label;
import javafx.scene.control.ProgressIndicator;

public class Result {

    @FXML
    public Label remark, marks, markstext, correcttext, wrongtext;

    @FXML
    public ProgressIndicator correct_progress, wrong_progress;

    int correct;
    int wrong;

    @FXML
    private void initialize() {
        correct = Quiz.correct;
        wrong = Quiz.wrong;

        correcttext.setText("Correct : " + correct);
        wrongtext.setText("Incorrect : " + String.valueOf(Quiz.wrong));

        marks.setText(correct + "/10");
        float correctf = (float) correct/10;
        correct_progress.setProgress(correctf);

        float wrongf = (float) wrong/10;
        wrong_progress.setProgress(wrongf);


        markstext.setText(correct + " Marks Scored");

        if (correct<2) {
            remark.setText("Oh no..! You fail the quiz ! Check your results here.");
        } else if (correct>=2 && correct<5) {
            remark.setText("Ah.. At least you have scored some points LOL ! Check your results here.");
        } else if (correct>=5 && correct<=7) {
            remark.setText("Okay I like it ! Check your results here.");
        } else if (correct==8 || correct==9) {
            remark.setText("Almost perfect ! Check you results here.");
        } else if (correct==10) {
            remark.setText("Congratulations SIR ! Check your results here.");
        }
    }

}
