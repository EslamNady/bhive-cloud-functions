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
            let inTime = '';
            let inkey = null;
            empSnap.child("attendance/" + date + "/in").forEach(child => {
                inkey = child.key;
                inTime = child.child('time').val();
            });

            let outTime = '';
            let outkey = null
            empSnap.child("attendance/" + date + "/out").forEach(child => {
                outkey = child.key;
                outTime = child.child('time').val();
            });
            if (inkey === '1' && outkey !== '1') {
                empSnap.ref.child(`workingHours/${date}/totalHours`).set(0).catch(() => null);
                empSnap.ref.child(`workingHours/${date}/lastIntervalhours`).set(0).catch(() => null);
            }
            const inTimeIsNull = empSnap.child("attendance/" + date + "/in").val();
            const outTimeIsNull = empSnap.child("attendance/" + date + "/out").val();
            const day = empSnap.child("attendance/" + date + "/day").val();


            if (outTimeIsNull === "null" && inTimeIsNull === "null") {
                if (empSnap.child("timeTable/" + day + "/out").val() !== "null") {
                    if (!empSnap.child("vacations/" + date).exists()) {
                        const MD = date.substring(3, date.length);
                        if (!snapshot.child("Holidays/" + MD).exists()) {
                            const working_days_num = parseInt(empSnap.child('working_days_num').val());
                            let attendanceScore = parseFloat(empSnap.child('attendanceScore').val());

                            const dayScore = (-2.5) / ((working_days_num + 1) / 1.0001);
                            attendanceScore = attendanceScore + dayScore;
                            empSnap.ref.child('working_days_num').set(working_days_num + 1).catch(() => null);
                            empSnap.ref.child('attended_days_num').set(parseInt(empSnap.child('attended_days_num').val()) + 1).catch(() => null);
                            empSnap.ref.child('attendanceScore').set(attendanceScore).catch(() => null);
                            empSnap.ref.child('lastDayScore').set(dayScore).catch(() => null);


                        }
                    }
                }
            } else {
                if (inkey === outkey) {


                    let inHoursStr = inTime.substring(0, inTime.indexOf(':'));
                    let inMinsStr = inTime.substring(inTime.indexOf(':') + 1, inTime.length);

                    let outHoursStr = outTime.substring(0, outTime.indexOf(':'));
                    let outMinsStr = outTime.substring(outTime.indexOf(':') + 1, outTime.length);

                    const dayIn_H = parseInt(inHoursStr);
                    const dayIn_M = parseInt(inMinsStr);


                    const dayOut_H = parseInt(outHoursStr);
                    const dayOut_M = parseInt(outMinsStr);

                    let workingHours = (dayOut_H + (dayOut_M * 0.25) / 15.0) - (dayIn_H + (dayIn_M * 0.25) / 15.0);

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

                        const dayWorkingHours = (weekDayOut_H + (weekDayOut_M * 0.25) / 15.0) - (weekDayIn_H + (weekDayIn_M * 0.25) / 15.0);

                        empSnap.ref.child('test').set(workingHours).catch(() => null)
                        if (change.before.child(`out/${outkey}`).exists()) {
                            const temp = parseFloat(empSnap.child(`workingHours/${date}/totalHours`).val()) - parseFloat(empSnap.child(`workingHours/${date}/lastIntervalhours`).val()) + workingHours;

                            empSnap.ref.child(`workingHours/${date}/totalHours`).set(temp).catch(() => null);
                            empSnap.ref.child(`workingHours/${date}/lastIntervalhours`).set(workingHours).catch(() => null);

                            workingHours = temp + workingHours;

                        } else {
                            const temp = parseFloat(empSnap.child(`workingHours/${date}/totalHours`).val()) + workingHours;

                            empSnap.ref.child(`workingHours/${date}/totalHours`).set(temp).catch(() => null);
                            empSnap.ref.child(`workingHours/${date}/lastIntervalhours`).set(workingHours).catch(() => null);

                            workingHours = temp + workingHours;
                        }

                        const workingHoursDiff = workingHours - dayWorkingHours;

                        let score = 0

                        if (workingHoursDiff < -3) {
                            score = -2.5;
                        } else if (workingHours < -2 && workingHoursDiff >= -3) {
                            score = -1.5;
                        }
                        else if (workingHours < -1 && workingHoursDiff >= -2) {
                            score = -1.25;
                        } else if (workingHours < -0.25 && workingHoursDiff >= -1) {
                            score = -1;
                        } else if (workingHours < 0.25 && workingHoursDiff >= -0.25) {
                            score = 2.5;
                        } else if (workingHours < 1 && workingHoursDiff >= 0.25) {
                            score = 2.75;
                        } else if (workingHours < 2 && workingHoursDiff >= 1) {
                            score = 3;
                        } else if (workingHours < 3 && workingHoursDiff >= 2) {
                            score = 3.5;
                        } else if (workingHours < 3 && workingHoursDiff >= 2) {
                            score = 3.5;
                        } else if (workingHours < 4 && workingHoursDiff >= 3) {
                            score = 3.75;
                        } else if (workingHoursDiff >= 4) {
                            score = 4;
                        }



                        const working_days_num = parseInt(empSnap.child('working_days_num').val());
                        let attendanceScore = parseFloat(empSnap.child('attendanceScore').val());
                        const lastDayScore = parseFloat(empSnap.child('lastDayScore').val());


                        // empSnap.ref.child('test').set(change.before.val()).catch(() => null);
                        if (change.before.child(`out/${outkey}`).exists()) {
                            const dayScore = (score) / ((working_days_num) / 1.0001);
                            attendanceScore = attendanceScore - lastDayScore;
                            attendanceScore = attendanceScore + dayScore;
                            empSnap.ref.child('attendanceScore').set(attendanceScore).catch(() => null);
                            empSnap.ref.child('lastDayScore').set(dayScore).catch(() => null);

                        } else {
                            const dayScore = (score) / ((working_days_num + 1) / 1.0001);
                            attendanceScore = attendanceScore + dayScore;
                            empSnap.ref.child('attendanceScore').set(attendanceScore).catch(() => null);
                            empSnap.ref.child('lastDayScore').set(dayScore).catch(() => null);
                            if (inkey === '1') {
                                empSnap.ref.child('working_days_num').set(working_days_num + 1).catch(() => null);
                                empSnap.ref.child('attended_days_num').set(parseInt(empSnap.child('attended_days_num').val()) + 1).catch(() => null);

                            }

                        }
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


export const onRequestCreate = functions.database.ref('/ChangeTimetableRequests/requests/{empID}/seen')
    .onCreate((snapshot, context) => {
        const seen = snapshot.val();
        if (!seen) {
            admin.database().ref('/ChangeTimetableRequests/unSeenReq').once("value").then((snap) => {
                const numOfNewReq = snap.val();
                snap.ref.set(numOfNewReq + 1).catch(() => null);
            }).catch(() => null);
        }
    });
export const onRequestUpdate = functions.database.ref('/ChangeTimetableRequests/requests/{empID}/seen')
    .onUpdate((change, context) => {
        const seen = change.after.val();
        if (!seen) {
            admin.database().ref('/ChangeTimetableRequests/unSeenReq').once("value").then((snap) => {
                const numOfNewReq = snap.val();
                snap.ref.set(numOfNewReq + 1).catch(() => null);
            }).catch(() => null);
        } else {
            admin.database().ref('/ChangeTimetableRequests/unSeenReq').once("value").then((snap) => {
                const numOfNewReq = snap.val();
                snap.ref.set(numOfNewReq - 1).catch(() => null);
            }).catch(() => null);
        }
    });



