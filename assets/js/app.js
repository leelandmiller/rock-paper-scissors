// Initialize Firebase
// var numUsers = 0;
var config = {
    apiKey: "AIzaSyArcN_XGrKBUrqY1Cpwnh4xKtX7yIECsfg",
    authDomain: "rock-paper-scissors-leeland.firebaseapp.com",
    databaseURL: "https://rock-paper-scissors-leeland.firebaseio.com",
    projectId: "rock-paper-scissors-leeland",
    storageBucket: "rock-paper-scissors-leeland.appspot.com",
    messagingSenderId: "1035860843643"
};
//init firebase
firebase.initializeApp(config);

// Create a variable to reference the database.
var database = firebase.database();

// Link to Firebase Database for viewer tracking
var connectionsRef = database.ref("/connections");
var connectedRef = database.ref(".info/connected");
var playersRef = database.ref("/players");
var player1Ref = database.ref("/players/1");
var player2Ref = database.ref("/players/2");
var playerNum = 1;
var currentUid;
var roundResetTimeout;

// Add ourselves to presence list when online.
connectedRef.on('value', function(snap) {
    // If they are connected..
    if (snap.val()) {
        // Add user to the connections list.
        var con = database.ref('/connections').push(true);

        currentUid = con.key;
        // Remove user from the connection list when they disconnect.
        con.onDisconnect().remove();
    }
});

playersRef.on('value', function(snap) {

    if (snap.val()) {
        if (!snap.child('1').val()) {
            playerNum = 1;
            $('#player-1-name').html('');
            $('#player-1-wins').html('');
            $('#player-1-losses').html('');
            $('#player-1-ties').html('');

        } else if (!snap.child('2').val()) {
            playerNum = 2;
            $('#player-2-name').html('');
            $('#player-2-wins').html('');
            $('#player-2-losses').html('');
            $('#player-2-ties').html('');
            // $('#input-container').show();
        }
        if (snap.child('1').val()) {
            $('#player-1-name').html(snap.child('1').val().name);
            $('#player-1-wins').html(snap.child('1').val().wins);
            $('#player-1-losses').html(snap.child('1').val().losses);
            $('#player-1-ties').html(snap.child('1').val().ties);
        }
        if (snap.child('2').val()) {
            $('#player-2-name').html(snap.child('2').val().name);
            $('#player-2-wins').html(snap.child('2').val().wins);
            $('#player-2-losses').html(snap.child('2').val().losses);
            $('#player-2-ties').html(snap.child('2').val().ties);
        }

        if (snap.child('1').val() && snap.child('2').val()) {
            showChoiceBtns();
            $('#input-container').hide();
            // console.log(currentUid);
        } else {
            // $('#score-area').html('');
        }


        // if player 1 doesn't have a choice child, show buttons
        if (!snap.child('1').hasChild('choice')) {
            $('#player-1-buttons').show();
        }
        // if player 2 doesn't have a choice child, show buttons
        if (!snap.child('2').hasChild('choice')) {
            $('#player-2-buttons').show();
        }
    }
});

database.ref('/result').on('value', function(snap) {
    $('#game-result').text(snap.val());
});

function checkForWinner(player1Choice, player2Choice) {
    var choices = {
        Rock: 0,
        Paper: 1,
        Scissors: 2
    }
    var p1Choice = choices[player1Choice];
    var p2Choice = choices[player2Choice];

    if (p1Choice === p2Choice) {
        database.ref('/result').set('Tie Game!');
        // tie - increment tie for both players in firebase
        playersRef.once('value').then(function(snap) {
            // increment p1 ties
            player1Ref.update({
                ties: ++snap.child('1').val().ties
            });
            // increment p2 ties
            player2Ref.update({
                ties: ++snap.child('2').val().ties
            });
        });

    } else if (((p1Choice - p2Choice + 3) % 3 === 1)) {
        // p1 wins - increment wins

        playersRef.once('value').then(function(snap) {
            database.ref('/result').set(snap.child('1').val().name + ' wins!');
            player1Ref.update({
                wins: ++snap.child('1').val().wins
            });
            // p2 loses - increment losses
            player2Ref.update({
                losses: ++snap.child('2').val().losses
            });
        });

    } else {
        // p1 loses - increment losses
        playersRef.once('value').then(function(snap) {
            database.ref('/result').set(snap.child('2').val().name + ' wins!');
            player1Ref.update({
                losses: ++snap.child('1').val().losses
            });
            // p2 wins - increment wins
            player2Ref.update({
                wins: ++snap.child('2').val().wins
            })
        });
    }

    // set timeout to reset for next round
    roundResetTimeout = setTimeout(function() {
        // TODO: reset #score-area, remove choice child from each player,
        database.ref('/result').remove();
        player1Ref.child('choice').remove();
        player2Ref.child('choice').remove();

        // display choice buttons
    }, 3000);
}

function showChoiceBtns() {
    var btnGroup = '<div class="btn-group" role="group"><button type="button" class="choice-btn btn btn-default">Rock</button><button type="button" class="choice-btn btn btn-default">Paper</button><button type="button" class="choice-btn btn btn-default">Scissors</button></div>';
    playersRef.once('value').then(function(snap) {
        if (currentUid === snap.child('1').val().connectionId) {
            $('#player-1-buttons').html(btnGroup);

        } else if (currentUid === snap.child('2').val().connectionId) {
            $('#player-2-buttons').html(btnGroup);
        }
    });
}

$('#game-area').on('click', '.choice-btn', function() {
    var choice = $(this).text();

    playersRef.once('value').then(function(snap) {

        snap.forEach(function(childSnap) {
            if (childSnap.val().connectionId === currentUid) {
                console.log('add ' + choice + ' to ' + childSnap.key);
                database.ref('players/' + childSnap.key).update({
                    choice: choice
                });
                // hides the choice buttons once you make your choice
                $('#player-' + childSnap.key + '-buttons').hide();
            }
        });

    }).then(function() {
        playersRef.once('value').then(function(snap) {
            var allChoicesMade = true;
            var choices = [];
            snap.forEach(function(childSnap) {
                allChoicesMade = childSnap.child('choice').exists();
                choices.push(childSnap.val().choice);
            });

            // console.log(allChoicesMade);
            if (allChoicesMade) {
                checkForWinner(choices[0], choices[1]);
            }
        });
    });
});

$('#add-player').on('click', function() {
    var name = $('#player-name-input').val();
    var newPlayer = {
        name: name,
        wins: 0,
        losses: 0,
        ties: 0,
        connectionId: currentUid
    }
    var player = playerNum;

    database.ref('/players/' + player).set(newPlayer);
    database.ref('/players/' + player).onDisconnect().remove();

    $('#input-container').hide('slow');
});
