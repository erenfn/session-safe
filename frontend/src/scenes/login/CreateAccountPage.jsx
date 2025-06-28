import React, { useState } from 'react';
import PropTypes from 'prop-types';
import styles from './Login.module.css';
import CustomTextField from '../../components/TextFieldComponents/CustomTextField/CustomTextField';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CircularProgress from '@mui/material/CircularProgress';
import { signUp } from '../../services/loginServices';
import CustomLink from '../../components/CustomLink/CustomLink';
import { handleAuthSuccess } from '../../utils/loginHelper';
import { useAuth } from '../../services/authProvider';
import { useNavigate } from 'react-router-dom';
import * as Yup from 'yup';
import { Form, Formik } from 'formik';
import Logo from '../../components/Logo/Logo';

function CreateAccountPage({ isAdmin = false, setIsAdmin }) {
  const { loginAuth } = useAuth();
  const navigate = useNavigate();
  const [serverErrors, setServerErrors] = useState([]);

  const validationSchema = Yup.object().shape({
    username: Yup.string()
      .required('Name is required')
      .matches(
        /^[A-Za-z0-9'\s-]+$/,
        'Username can only contain letters, hyphens and apostrophes'
      )
      .trim(),
    email: Yup.string()
      .matches(
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        'Enter a valid email address'
      )
      .required('Email is required')
      .trim(),
    password: Yup.string()
      .required('Password is required')
      .min(8, 'Password must be at least 8 characters')
      .matches(
        /[!@#$%^&*(),.?":{}|<>_\-=]/,
        'Password must contain at least one special character'
      ),
    ...(isAdmin && {
      confirmPassword: Yup.string()
        .required('Confirm Password is required')
        .oneOf([Yup.ref('password'), null], 'Passwords must match'),
    }),
  });

  return (
    <Formik
      initialValues={{
        username: '',
        email: '',
        password: '',
      }}
      validationSchema={validationSchema}
      validateonMount={false}
      validateonBlur={true}
      onSubmit={async (values, { setSubmitting }) => {
        setServerErrors([]);
        try {
          const response = await signUp(values);
          setIsAdmin(false);
          handleAuthSuccess(response, loginAuth, navigate);
        } catch (error) {
          if (error.response?.data?.errors) {
            setServerErrors(error.response.data.errors);
          } else if (error.response?.data?.error) {
            setServerErrors([error.response.data.error]);
          } else {
            setServerErrors([
              'An error occurred. Please check your network connection and try again.',
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
        <Form className={styles['login-container']}>
          <Logo/>
          {isAdmin ? (
            <h2> Create admin account</h2>
          ) : (
            <h2>Create an account</h2>
          )}
          <div className={styles['form-group']}>
            <CustomTextField
              id="username"
              name="username"
              type="text"
              labelText="Username*:"
              checkCircleIconVisible={true}
              displayCheckCircleIcon={touched.username && !errors.username}
              placeholder="Enter your username"
              textFieldMargin="none"
              TextFieldWidth="full"
              required={true}
              value={values.username}
              onChange={handleChange}
              onBlur={handleBlur}
              error={Boolean(touched.username && errors.username)}
              helperText={touched.username && errors.username}
            />
          </div>

          <div className={styles['form-group']}>
            <CustomTextField
              id="email"
              type="email"
              name="email"
              labelText="Email*:"
              checkCircleIconVisible={true}
              displayCheckCircleIcon={touched.email && !errors.email}
              placeholder="Enter your email"
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

          <div className={styles['form-group']}>
            <CustomTextField
              id="password"
              type="password"
              name="password"
              labelText="Password*:"
              checkCircleIconVisible={true}
              displayCheckCircleIcon={touched.password && !errors.password}
              placeholder="Create your password"
              textFieldMargin="none"
              TextFieldWidth="full"
              required={true}
              value={values.password}
              onChange={handleChange}
              onBlur={handleBlur}
              error={Boolean(touched.password && errors.password)}
              helperText={touched.password && errors.password}
            />
          </div>

          {isAdmin && (
            <div className={styles['form-group']}>
              <CustomTextField
                id="confirmPassword"
                type="password"
                name="confirmPassword"
                labelText="Confirm Password*:"
                checkCircleIconVisible={true}
                displayCheckCircleIcon={
                  touched.confirmPassword && !errors.confirmPassword
                }
                placeholder="Confirm your password"
                textFieldMargin="none"
                TextFieldWidth="full"
                required={true}
                value={values.confirmPassword}
                onChange={handleChange}
                onBlur={handleBlur}
                error={Boolean(
                  touched.confirmPassword && errors.confirmPassword
                )}
                helperText={touched.confirmPassword && errors.confirmPassword}
              />
            </div>
          )}
          <div className={styles['password-constraints']}>
            <CheckCircleIcon
              style={{
                color: values.password.length >= 8 ? 'green' : '#D0D5DD',
                fontSize: '20px',
                marginRight: '5px',
              }}
            />
            Must be at least 8 characters
          </div>
          <div className={styles['password-constraints']}>
            <CheckCircleIcon
              style={{
                color: /[!@#$%^&*(),.?":{}|<>_\-=]/.test(values.password)
                  ? 'green'
                  : '#D0D5DD',
                fontSize: '20px',
                marginRight: '5px',
              }}
            />
            Must contain one special character
          </div>

          {serverErrors.length > 0 && (
            <div className={styles['error-message']}>
              {serverErrors.map((error, index) => (
                <div key={index}>{error}</div>
              ))}
            </div>
          )}

          <button
            className={styles['create-account-button']}
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <CircularProgress size={12} color="inherit" />
            ) : (
              'Get started'
            )}
          </button>
          <div className={styles['sign-up-link']}>
            Already have an account? <CustomLink text="Log in" url="/login" />
          </div>
        </Form>
      )}
    </Formik>
  );
}

CreateAccountPage.propTypes = {
  setIsAdmin: PropTypes.func,
  isAdmin: PropTypes.bool,
};

export default CreateAccountPage;
