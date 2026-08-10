<!DOCTYPE html>
<html lang="en">

<head>

    <meta charset="UTF-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >

    <title>
        Staff Dashboard - SR Auto Finance
    </title>


    <style>

        * {
            box-sizing: border-box;
        }


        body {

            margin: 0;

            font-family:
                Arial,
                Helvetica,
                sans-serif;

            background: #f1f5f9;

            color: #0f172a;

        }


        .topbar {

            height: 68px;

            background: #ffffff;

            border-bottom:
                1px solid #e2e8f0;

            display: flex;

            align-items: center;

            justify-content: space-between;

            padding:
                0 24px;

            position: sticky;

            top: 0;

            z-index: 20;

        }


        .brand {

            display: flex;

            align-items: center;

            gap: 12px;

        }


        .logo {

            width: 42px;

            height: 42px;

            border-radius: 11px;

            background: #2563eb;

            color: #ffffff;

            display: flex;

            align-items: center;

            justify-content: center;

            font-weight: 800;

        }


        .brand-title {

            font-size: 16px;

            font-weight: 800;

        }


        .brand-subtitle {

            font-size: 11px;

            color: #64748b;

            margin-top: 2px;

        }


        .staff-area {

            display: flex;

            align-items: center;

            gap: 12px;

        }


        .staff-info {

            text-align: right;

        }


        .staff-name {

            font-size: 13px;

            font-weight: 700;

        }


        .staff-id {

            font-size: 11px;

            color: #64748b;

            margin-top: 2px;

        }


        .logout-btn {

            border: 0;

            background: #fee2e2;

            color: #b91c1c;

            padding:
                9px 13px;

            border-radius: 8px;

            font-size: 12px;

            font-weight: 700;

            cursor: pointer;

        }


        .page {

            max-width: 1250px;

            margin: 0 auto;

            padding: 24px;

        }


        .welcome {

            margin-bottom: 22px;

        }


        .welcome h1 {

            margin: 0;

            font-size: 24px;

        }


        .welcome p {

            margin:
                6px 0 0;

            color: #64748b;

            font-size: 13px;

        }


        .cards {

            display: grid;

            grid-template-columns:
                repeat(
                    4,
                    minmax(
                        0,
                        1fr
                    )
                );

            gap: 16px;

        }


        .card {

            background: #ffffff;

            border:
                1px solid #e2e8f0;

            border-radius: 14px;

            padding: 18px;

            min-height: 125px;

        }


        .card-label {

            font-size: 12px;

            color: #64748b;

            font-weight: 600;

        }


        .card-value {

            margin-top: 12px;

            font-size: 25px;

            font-weight: 800;

            color: #0f172a;

        }


        .card-note {

            margin-top: 7px;

            font-size: 11px;

            color: #94a3b8;

        }


        .blue {

            border-left:
                4px solid #2563eb;

        }


        .green {

            border-left:
                4px solid #16a34a;

        }


        .orange {

            border-left:
                4px solid #ea580c;

        }


        .red {

            border-left:
                4px solid #dc2626;

        }


        .purple {

            border-left:
                4px solid #7c3aed;

        }


        .section {

            margin-top: 22px;

            background: #ffffff;

            border:
                1px solid #e2e8f0;

            border-radius: 14px;

            padding: 20px;

        }


        .section-header {

            display: flex;

            align-items: center;

            justify-content: space-between;

            margin-bottom: 16px;

        }


        .section-title {

            margin: 0;

            font-size: 16px;

        }


        .section-subtitle {

            margin:
                4px 0 0;

            font-size: 11px;

            color: #64748b;

        }


        .quick-actions {

            display: grid;

            grid-template-columns:
                repeat(
                    3,
                    minmax(
                        0,
                        1fr
                    )
                );

            gap: 14px;

        }


        .action-btn {

            min-height: 90px;

            border:
                1px solid #e2e8f0;

            background: #f8fafc;

            border-radius: 12px;

            padding: 15px;

            text-align: left;

            cursor: pointer;

            transition:
                0.15s ease;

        }


        .action-btn:hover {

            background: #eff6ff;

            border-color:
                #93c5fd;

        }


        .action-title {

            font-size: 14px;

            font-weight: 800;

            color: #0f172a;

        }


        .action-text {

            margin-top: 6px;

            font-size: 11px;

            color: #64748b;

            line-height: 1.5;

        }


        .info-box {

            margin-top: 20px;

            background: #eff6ff;

            border:
                1px solid #bfdbfe;

            color: #1e40af;

            border-radius: 10px;

            padding: 13px;

            font-size: 12px;

            line-height: 1.5;

        }


        .loading {

            display: none;

            position: fixed;

            inset: 0;

            background:
                rgba(
                    15,
                    23,
                    42,
                    0.25
                );

            align-items: center;

            justify-content: center;

            z-index: 100;

        }


        .loading-box {

            background: #ffffff;

            padding:
                20px 26px;

            border-radius: 12px;

            font-size: 13px;

            font-weight: 700;

            box-shadow:
                0 15px 40px
                rgba(
                    0,
                    0,
                    0,
                    0.2
                );

        }


        @media (
            max-width: 900px
        ) {

            .cards {

                grid-template-columns:
                    repeat(
                        2,
                        minmax(
                            0,
                            1fr
                        )
                    );

            }

            .quick-actions {

                grid-template-columns:
                    1fr;

            }

        }


        @media (
            max-width: 600px
        ) {

            .topbar {

                padding:
                    0 14px;

            }

            .page {

                padding: 14px;

            }

            .brand-title {

                font-size: 14px;

            }

            .staff-info {

                display: none;

            }

            .cards {

                grid-template-columns:
                    1fr 1fr;

                gap: 10px;

            }

            .card {

                padding: 14px;

                min-height: 110px;

            }

            .card-value {

                font-size: 20px;

            }

        }

    </style>

</head>


<body>


    <!-- ======================================================
         TOP BAR
    ======================================================= -->

    <header class="topbar">


        <div class="brand">

            <div class="logo">
                SR
            </div>


            <div>

                <div class="brand-title">
                    SR Auto Finance
                </div>

                <div class="brand-subtitle">
                    Staff Portal
                </div>

            </div>

        </div>


        <div class="staff-area">


            <div class="staff-info">

                <div
                    class="staff-name"
                    id="staffName"
                >
                    Staff
                </div>

                <div
                    class="staff-id"
                    id="staffId"
                >
                    -
                </div>

            </div>


            <button
                type="button"
                class="logout-btn"
                id="logoutBtn"
            >
                Logout
            </button>


        </div>


    </header>



    <!-- ======================================================
         PAGE
    ======================================================= -->

    <main class="page">


        <section class="welcome">

            <h1>
                Welcome,
                <span id="welcomeName">
                    Staff
                </span>
            </h1>

            <p>
                Manage your customers and daily collections.
            </p>

        </section>



        <!-- ==================================================
             DASHBOARD CARDS
        =================================================== -->

        <section class="cards">


            <div class="card blue">

                <div class="card-label">
                    My Customers
                </div>

                <div
                    class="card-value"
                    id="myCustomers"
                >
                    0
                </div>

                <div class="card-note">
                    Assigned customers
                </div>

            </div>



            <div class="card blue">

                <div class="card-label">
                    Active Loans
                </div>

                <div
                    class="card-value"
                    id="activeLoans"
                >
                    0
                </div>

                <div class="card-note">
                    Assigned active loans
                </div>

            </div>



            <div class="card orange">

                <div class="card-label">
                    Today's Due
                </div>

                <div
                    class="card-value"
                    id="todayDue"
                >
                    ₹0
                </div>

                <div class="card-note">
                    Due from assigned customers
                </div>

            </div>



            <div class="card green">

                <div class="card-label">
                    Today's Collection
                </div>

                <div
                    class="card-value"
                    id="todayCollection"
                >
                    ₹0
                </div>

                <div class="card-note">
                    Collected today
                </div>

            </div>



            <div class="card green">

                <div class="card-label">
                    This Month Collection
                </div>

                <div
                    class="card-value"
                    id="monthCollection"
                >
                    ₹0
                </div>

                <div class="card-note">
                    Current month
                </div>

            </div>



            <div class="card red">

                <div class="card-label">
                    Total Pending
                </div>

                <div
                    class="card-value"
                    id="totalPending"
                >
                    ₹0
                </div>

                <div class="card-note">
                    Assigned loan pending
                </div>

            </div>



            <div class="card purple">

                <div class="card-label">
                    Cash in Hand
                </div>

                <div
                    class="card-value"
                    id="cashInHand"
                >
                    ₹0
                </div>

                <div class="card-note">
                    Current staff holding
                </div>

            </div>



            <div class="card orange">

                <div class="card-label">
                    Deposit Pending
                </div>

                <div
                    class="card-value"
                    id="depositPending"
                >
                    ₹0
                </div>

                <div class="card-note">
                    Awaiting owner approval
                </div>

            </div>


        </section>



        <!-- ==================================================
             QUICK ACTIONS
        =================================================== -->

        <section class="section">


            <div class="section-header">

                <div>

                    <h2 class="section-title">
                        Quick Actions
                    </h2>

                    <p class="section-subtitle">
                        Main staff activities
                    </p>

                </div>

            </div>



            <div class="quick-actions">


                <button
                    type="button"
                    class="action-btn"
                    id="customersBtn"
                >

                    <div class="action-title">
                        My Customers
                    </div>

                    <div class="action-text">
                        View assigned customers and their loan details.
                    </div>

                </button>



                <button
                    type="button"
                    class="action-btn"
                    id="collectionBtn"
                >

                    <div class="action-title">
                        Collect Payment
                    </div>

                    <div class="action-text">
                        Select a customer and collect the due amount.
                    </div>

                </button>



                <button
                    type="button"
                    class="action-btn"
                    id="depositBtn"
                >

                    <div class="action-title">
                        Deposit Collection
                    </div>

                    <div class="action-text">
                        Request owner approval for collected cash.
                    </div>

                </button>


            </div>



            <div class="info-box">

                Staff access is limited to assigned customers,
                loan details, collection and deposit activities.
                Loan creation, loan editing and financial master
                data changes will remain owner controlled.

            </div>


        </section>


    </main>



    <!-- ======================================================
         LOADING
    ======================================================= -->

    <div
        class="loading"
        id="loadingOverlay"
    >

        <div class="loading-box">
            Loading staff dashboard...
        </div>

    </div>



    <!-- ======================================================
         JS
    ======================================================= -->

    <script
        type="module"
        src="js/staff-dashboard.js"
    ></script>


</body>

</html>
