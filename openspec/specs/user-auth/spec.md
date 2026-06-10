# User Authentication Specification

## Purpose

Manage user registration, authentication, session persistence, and profile preferences for the diet planning application.

## Requirements

### Requirement: Registration

The system MUST allow a new user to register with email and password via Supabase Auth. Upon successful registration, the system MUST automatically create a profile record for the user.

#### Scenario: Successful signup creates profile

- GIVEN a visitor with a valid email and password
- WHEN they submit the registration form
- THEN a new auth user is created AND a profile record is inserted with default values (daily_calorie_goal: 2000)

#### Scenario: Duplicate email registration

- GIVEN an email that is already registered
- WHEN a visitor attempts to register with that email
- THEN the system MUST reject the registration and return a "User already registered" error

### Requirement: Authentication Session

The system MUST authenticate users with email/password and maintain a session. The user MUST be able to log out, which ends the session.

#### Scenario: Successful login

- GIVEN a registered user with valid credentials
- WHEN they submit the login form
- THEN the system creates a session and redirects to the dashboard

#### Scenario: Invalid credentials

- GIVEN a registered user
- WHEN they submit an incorrect password
- THEN the system returns "Invalid login credentials" and does NOT create a session

### Requirement: Session Persistence

The system MUST persist the auth session across browser tabs and page refreshes using the Supabase JS client's built-in localStorage session management.

#### Scenario: Session survives page refresh

- GIVEN an authenticated user
- WHEN they refresh the page or close and reopen the browser
- THEN the user remains authenticated and sees the dashboard without re-entering credentials

#### Scenario: Session cleared on logout

- GIVEN an authenticated user
- WHEN they click "Log out"
- THEN the session is destroyed AND the user is redirected to /login AND a page refresh still shows the login page

### Requirement: Protected Routes

The system SHALL redirect unauthenticated users to the /login page when they attempt to access any protected route.

#### Scenario: Unauthenticated access redirects

- GIVEN a visitor who is NOT logged in
- WHEN they navigate to /calendar
- THEN they are redirected to /login with the original URL preserved as a redirect parameter

#### Scenario: Authenticated access succeeds

- GIVEN an authenticated user
- WHEN they navigate to /calendar
- THEN the protected page renders normally

### Requirement: Profile Editing

The user MUST be able to edit their display name and daily calorie goal from the profile page.

#### Scenario: Update daily calorie goal

- GIVEN an authenticated user viewing their profile
- WHEN they change daily_calorie_goal from 2000 to 1800 and save
- THEN the profile is updated AND the new goal persists on reload

#### Scenario: Invalid calorie goal

- GIVEN an authenticated user
- WHEN they enter a daily_calorie_goal of 0 or a negative number
- THEN the system rejects the value and shows a validation error

### Requirement: Week Start Day

The profile MUST store a configurable week start day (default: Monday). The system MUST use this setting for calendar navigation and weekly scoring.

#### Scenario: Default week start

- GIVEN a newly registered user
- WHEN they view the weekly planning screen
- THEN the week starts on Monday by default

#### Scenario: Custom week start day

- GIVEN an authenticated user
- WHEN they set week_start_day to "Sunday" in profile settings
- THEN the weekly planning screen and scoring period start on Sunday
