import React, { useState, useEffect } from "react";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import styles from "./Login.module.css";
import CustomTextField from "../../components/TextFieldComponents/CustomTextField/CustomTextField";
import CircularProgress from "@mui/material/CircularProgress";
import { login } from "../../services/loginServices";
import CustomLink from "../../components/CustomLink/CustomLink";
import { handleAuthSuccess } from "../../utils/loginHelper";
import { useAuth } from "../../services/authProvider";
import { useNavigate, useLocation } from "react-router-dom";
import Logo from "../../components/Logo/Logo";
import Button from "../../components/Button/Button";

const validationSchema = Yup.object({
  email: Yup.string()
    .required("Email is required")
    .matches(
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      "Invalid email address"
    )
    .trim(),
  password: Yup.string().required("Password is required").trim(),
});

function LoginPage({ isAdmin = false }) {
  const [serverErrors, setServerErrors] = useState([]);
  const [isPreconfiguredLoading, setIsPreconfiguredLoading] = useState(false);
  const { loginAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const params = new URLSearchParams(location.search);
  const redirectTo = params.get("redirect") || '/';

  useEffect(() => {
    if (isAdmin) {
      navigate("/signup");
    }
  }, [isAdmin]);

  const handlePreconfiguredLogin = async () => {
    setIsPreconfiguredLoading(true);
    setServerErrors([]);
    try {
      const response = await login({
        email: "member@gmail.com",
        password: "MemberPassword123!"
      });
      handleAuthSuccess(response, loginAuth, navigate, redirectTo);
    } catch (error) {
      if (error.response?.data?.errors) {
        setServerErrors(error.response.data.errors);
      } else if (error.response?.data?.error) {
        setServerErrors([error.response.data.error]);
      } else {
        setServerErrors([
          "An error occurred. Please check your network connection and try again.",
        ]);
      }
    } finally {
      setIsPreconfiguredLoading(false);
    }
  };

  return (
    <Formik
      initialValues={{
        email: "",
        password: "",
      }}
      validationSchema={validationSchema}
      validateOnChange={false}
      validateOnBlur={true}
      onSubmit={async (values, { setSubmitting }) => {
        setServerErrors([]);
        try {
          const response = await login(values);
          handleAuthSuccess(response, loginAuth, navigate, redirectTo);
        } catch (error) {
          if (error.response?.data?.errors) {
            setServerErrors(error.response.data.errors);
          } else if (error.response?.data?.error) {
            setServerErrors([error.response.data.error]);
          } else {
            setServerErrors([
              "An error occurred. Please check your network connection and try again.",
            ]);
          }
        } finally {
          setSubmitting(false);
        }
      }}
    >
      {({
        isSubmitting,
        touched,
        errors,
        handleChange,
        handleBlur,
        values,
      }) => (
        <Form className={styles["login-container"]}>
          <Logo/>
          <h2>Log in to your account</h2>

          <div className={styles["form-group"]}>
            <CustomTextField
              id="email"
              name="email"
              type="email"
              placeholder="Enter email"
              labelText="Email:"
              textFieldMargin="none"
              TextFieldWidth="full"
              required={true}
              value={values.email}
              onChange={handleChange}
              onBlur={handleBlur}
              error={Boolean(touched.email && errors.email)}
              helperText={touched.email && errors.email}
            />
          </div>

          <div className={styles["form-group"]}>
            <CustomTextField
              id="password"
              name="password"
              type="password"
              placeholder="Enter password"
              labelText="Password:"
              textFieldMargin="none"
              TextFieldWidth="full"
              required={true}
              value={values.password}
              onChange={handleChange}
              onBlur={handleBlur}
              error={Boolean(touched.password && errors.password)}
              helperText={touched.password && errors.password}
            />

            {serverErrors.length > 0 && (
              <div className={styles["error-message"]}>
                {serverErrors.map((error, index) => (
                  <div key={index}>{error}</div>
                ))}
              </div>
            )}
          </div>

          <Button
            text="Sign In"
            onClick={() => {}}
            buttonType="primary"
            type="submit"
            loading={isSubmitting}
            disabled={isSubmitting}
            style={{ width: '100%', marginBottom: '15px', borderRadius: '8px', fontSize: '13px' }}
          />

          <Button
            text="Sign in with a preconfigured account"
            onClick={handlePreconfiguredLogin}
            buttonType="secondary-purple"
            type="button"
            loading={isPreconfiguredLoading}
            disabled={isPreconfiguredLoading}
            style={{ width: '100%', marginBottom: '15px', borderRadius: '8px', fontSize: '13px' }}
          />

          <div className={styles['sign-up-link']}>
            <div className={styles["create-account-link"]}>
              Don't have an account? <CustomLink text="Create Account" url="/signup" />
            </div>
          </div>
        </Form>
      )}
    </Formik>
  );
}

export default LoginPage;