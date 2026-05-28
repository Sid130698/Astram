package com.astram.backend.controller;

import com.astram.backend.model.GameMessage;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

@Controller
public class GameMessageController {

    // Client sends to /app/game.test
    // Server broadcasts response to everyone on /topic/game

    @MessageMapping("/game.test")
    @SendTo("/topic/game")
    public GameMessage handleTestMessage(GameMessage message){
        System.out.println("Recieved message from: " + message.getSender() + " -> " + message.getContent());
        return message;
    }
}
