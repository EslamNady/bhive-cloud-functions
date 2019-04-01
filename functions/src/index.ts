import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin'

admin.initializeApp();
// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//
// export const helloWorld = functions.https.onRequest((request, response) => {
//     response.send("<h2>Hello Nour from Firebase!</h2><h4>Eslam byslem 3leky</h4>");
// });

export const onAttendanceUpdate = functions.database.ref('/Employees/{empID}/attendance/{date}')
    .onUpdate((change, context) => {
        const after = change.after.val();
        const before = change.before.val();

        if (after === before) {
            console.log("no change");
            return null;
        }

        // const outTime = snapshot.val();
        const empID = context.params.empID;
        // const empRef = admin.database().ref('/Employees/' + empID);

        const date = context.params.date;
        // const dateRef = empRef.child("/attendance/" + date);

        // const HolidaysRef = admin.database().ref('/Holidays');


        admin.database().ref('/').once("value").then(function (snapshot) {
            const empSnap = snapshot.child("Employees/" + empID);
            const inTime = empSnap.child("attendance/" + date + "/in").val();
            const outTime = empSnap.child("attendance/" + date + "/out").val();
            const day = empSnap.child("attendance/" + date + "/day").val();


            if (outTime === "null") {
                if (empSnap.child("timeTable/" + day + "/out").val() !== "null") {
                    if (!empSnap.child("vacation/" + date).exists()) {
                        const MD = date.substring(3, date.length);
                        if (!snapshot.child("Holidays/" + MD).exists()) {
                            const working_days_num = parseInt(empSnap.child('working_days_num').val());
                            let attendanceScore = parseFloat(empSnap.child('attendanceScore').val());

                            const dayScore = (-2.5) / ((working_days_num + 1) / 1.0001);
                            attendanceScore = attendanceScore + dayScore;
                            empSnap.ref.child('working_days_num').set(working_days_num + 1).catch(() => null);
                            empSnap.ref.child('attendanceScore').set(attendanceScore).catch(() => null);
                            empSnap.ref.child('lastDayScore').set(dayScore).catch(() => null);

                        }
                    }
                }
            } else {
                let inHoursStr = inTime.substring(0, inTime.indexOf(':'));
                let inMinsStr = inTime.substring(inTime.indexOf(':') + 1, inTime.length);

                let outHoursStr = outTime.substring(0, outTime.indexOf(':'));
                let outMinsStr = outTime.substring(outTime.indexOf(':') + 1, outTime.length);

                const dayIn_H = parseInt(inHoursStr);
                const dayIn_M = parseInt(inMinsStr);

                const dayOut_H = parseInt(outHoursStr);
                const dayOut_M = parseInt(outMinsStr);

                if (empSnap.child('timeTable/' + day + "/in").val() !== "null" && empSnap.child('timeTable/' + day + "/out").val() !== "null") {
                    const weekDayIN = empSnap.child('timeTable/' + day + "/in").val();
                    const weekDayout = empSnap.child('timeTable/' + day + "/out").val();

                    inHoursStr = weekDayIN.substring(0, weekDayIN.indexOf(':'));
                    inMinsStr = weekDayIN.substring(weekDayIN.indexOf(':') + 1, weekDayIN.length);

                    outHoursStr = weekDayout.substring(0, weekDayout.indexOf(':'));
                    outMinsStr = weekDayout.substring(weekDayout.indexOf(':') + 1, weekDayout.length);


                    const weekDayIn_H = parseInt(inHoursStr);
                    const weekDayIn_M = parseInt(inMinsStr);

                    const weekDayOut_H = parseInt(outHoursStr);
                    const weekDayOut_M = parseInt(outMinsStr);

                    const inDifferance = (weekDayIn_H - dayIn_H) + (((weekDayIn_M - dayIn_M) * 0.25) / 15)

                    const outDifferance = (dayOut_H - weekDayOut_H) + (((dayOut_M - weekDayOut_M) * 0.25) / 15)

                    let inScore = 0;
                    let outScore = 0;

                    //inScore
                    if (inDifferance > 2)
                        inScore = 1.7;
                    else if (inDifferance > 1)
                        inScore = 1.5;
                    else if (inDifferance > 0 && inDifferance <= 1)
                        inScore = 1.3;
                    else if (inDifferance > -0.25 && inDifferance <= 0)
                        inScore = 1.25;
                    else if (inDifferance > -0.5 && inDifferance <= -0.25)
                        inScore = 1;
                    else if (inDifferance > -1 && inDifferance <= -0.5)
                        inScore = 0.75;
                    else if (inDifferance > -1.5 && inDifferance <= -1)
                        inScore = 0;
                    else if (inDifferance <= -1.5)
                        inScore = -1;
                    //outScore
                    if (outDifferance > 3)
                        outScore = 3.5;
                    else if (outDifferance > 2)
                        outScore = 2;
                    else if (outDifferance > 1)
                        outScore = 1.5;
                    else if (outDifferance > 0 && outDifferance <= 1)
                        outScore = 1.3;
                    else if (outDifferance > -0.25 && outDifferance <= 0)
                        outScore = 1.25;
                    else if (outDifferance > -0.5 && outDifferance <= -0.25)
                        outScore = 1;
                    else if (outDifferance > -1 && outDifferance <= -0.5)
                        outScore = 0.75;
                    else if (outDifferance > -1.5 && outDifferance <= -1)
                        outScore = 0;
                    else if (outDifferance <= -1.5)
                        outScore = -1;



                    const working_days_num = parseInt(empSnap.child('working_days_num').val());
                    let attendanceScore = parseFloat(empSnap.child('attendanceScore').val());
                    const lastDayScore = parseInt(empSnap.child('lastDayScore').val());
                    const dayScore = (inScore + outScore) / ((working_days_num + 1) / 1.0001);



                    if (change.before.child("Employees/" + empID + "/attendance/" + date + "/out").exists()) {

                        attendanceScore = attendanceScore - lastDayScore + dayScore;
                        empSnap.ref.child('attendanceScore').set(attendanceScore).catch(() => null);
                        empSnap.ref.child('lastDayScore').set(dayScore).catch(() => null);

                    } else {

                        attendanceScore = attendanceScore + dayScore;
                        empSnap.ref.child('working_days_num').set(working_days_num + 1).catch(() => null);
                        empSnap.ref.child('attendanceScore').set(attendanceScore).catch(() => null);
                        empSnap.ref.child('attended_days_num').set(parseInt(empSnap.child('attended_days_num').val()) + 1).catch(() => null);
                        empSnap.ref.child('lastDayScore').set(dayScore).catch(() => null);

                    }
                }

            }



        }).catch(() => null);




        // let x = admin.database().ref('/Employees/' + context.params.empID).child('working_days_num').once('value').then(function (snapshot) {
        //     var val = parseInt(snapshot.val());


        //     let update = admin.database().ref('/Employees/' + context.params.empID).child('working_days_num').set(val + 1);

        //     update = admin.database().ref('/Employees/' + context.params.empID).child('attended_days_num').set(val);
        //     update;
        // });

        // x;


        return 200


    });




